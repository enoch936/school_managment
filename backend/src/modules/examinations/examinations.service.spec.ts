import { ExaminationsService } from './examinations.service';

describe('ExaminationsService', () => {
  describe('calculateLetterGrade', () => {
    it('returns A for percentage >= 90', () => {
      expect(ExaminationsService.calculateLetterGrade(95)).toBe('A');
      expect(ExaminationsService.calculateLetterGrade(90)).toBe('A');
    });

    it('returns B for percentage between 80 and 89', () => {
      expect(ExaminationsService.calculateLetterGrade(88)).toBe('B');
      expect(ExaminationsService.calculateLetterGrade(80)).toBe('B');
    });

    it('returns C for percentage between 70 and 79', () => {
      expect(ExaminationsService.calculateLetterGrade(75)).toBe('C');
      expect(ExaminationsService.calculateLetterGrade(70)).toBe('C');
    });

    it('returns D for percentage between 60 and 69', () => {
      expect(ExaminationsService.calculateLetterGrade(65)).toBe('D');
      expect(ExaminationsService.calculateLetterGrade(60)).toBe('D');
    });

    it('returns F for percentage < 60', () => {
      expect(ExaminationsService.calculateLetterGrade(59)).toBe('F');
      expect(ExaminationsService.calculateLetterGrade(0)).toBe('F');
    });
  });
});
