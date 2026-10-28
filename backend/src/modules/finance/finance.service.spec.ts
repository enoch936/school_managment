import { FinanceService } from './finance.service';
import { PrismaService } from '../../database/prisma.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let prismaMock: Partial<PrismaService>;

  beforeEach(() => {
    prismaMock = {
      invoice: {
        findMany: jest.fn(),
      } as unknown as PrismaService['invoice'],
      school: {
        findFirst: jest.fn(),
      } as unknown as PrismaService['school'],
    };
    service = new FinanceService(prismaMock as PrismaService);
  });

  describe('getSummary calculation logic', () => {
    it('accurately calculates collection rates and overdue counts with integer minor units', async () => {
      const now = new Date();
      const pastDueDate = new Date(now.getTime() - 86400000 * 5); // 5 days ago
      const futureDueDate = new Date(now.getTime() + 86400000 * 5); // 5 days in future

      (prismaMock.invoice!.findMany as jest.Mock).mockResolvedValue([
        {
          totalMinor: 500000, // 5,000.00 ETB
          balanceMinor: 200000, // 2,000.00 ETB remaining (3,000.00 collected)
          status: 'PARTIALLY_PAID',
          dueDate: pastDueDate,
          currency: 'ETB',
        },
        {
          totalMinor: 500000, // 5,000.00 ETB
          balanceMinor: 0, // Fully paid
          status: 'PAID',
          dueDate: pastDueDate,
          currency: 'ETB',
        },
        {
          totalMinor: 300000, // 3,000.00 ETB
          balanceMinor: 300000, // Not yet due
          status: 'ISSUED',
          dueDate: futureDueDate,
          currency: 'ETB',
        },
      ]);

      const summary = await service.getSummary('org-123');

      expect(summary.currency).toBe('ETB');
      expect(summary.totalInvoicedMinor).toBe(1300000); // 13,000.00 ETB
      expect(summary.totalOutstandingMinor).toBe(500000); // 5,000.00 ETB
      expect(summary.totalCollectedMinor).toBe(800000); // 8,000.00 ETB
      expect(summary.collectionRate).toBe(62); // 800000 / 1300000 = 61.5% -> 62%
      expect(summary.overdueCount).toBe(1); // Only the first invoice is past due with balance > 0
      expect(summary.totalInvoicesCount).toBe(3);
    });

    it('handles empty invoice set gracefully with 0 collection rate', async () => {
      (prismaMock.invoice!.findMany as jest.Mock).mockResolvedValue([]);

      const summary = await service.getSummary('org-123');

      expect(summary.totalInvoicedMinor).toBe(0);
      expect(summary.totalCollectedMinor).toBe(0);
      expect(summary.collectionRate).toBe(0);
      expect(summary.overdueCount).toBe(0);
    });
  });
});
