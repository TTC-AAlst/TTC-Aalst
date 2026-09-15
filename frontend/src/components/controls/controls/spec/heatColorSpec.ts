import { getHeatColor } from '../heatColor';

describe('getHeatColor', () => {
  it('has no colour without games', () => {
    expect(getHeatColor(0, 0)).toBeUndefined();
  });

  describe('buckets, at full confidence', () => {
    it('reds 0%', () => {
      expect(getHeatColor(0, 10)?.bg).toBe('rgb(217, 83, 79)');
    });

    it('reds just below the orange boundary', () => {
      expect(getHeatColor(29, 71)?.bg).toBe('rgb(217, 83, 79)');
    });

    it('oranges exactly 30%', () => {
      expect(getHeatColor(3, 7)?.bg).toBe('rgb(232, 131, 58)');
    });

    it('oranges just below the yellow boundary', () => {
      expect(getHeatColor(49, 51)?.bg).toBe('rgb(232, 131, 58)');
    });

    it('yellows exactly 50%', () => {
      expect(getHeatColor(5, 5)?.bg).toBe('rgb(230, 194, 41)');
    });

    it('yellows just below the light green boundary', () => {
      expect(getHeatColor(64, 36)?.bg).toBe('rgb(230, 194, 41)');
    });

    it('light greens exactly 65%', () => {
      expect(getHeatColor(65, 35)?.bg).toBe('rgb(139, 195, 74)');
    });

    it('light greens just below the green boundary', () => {
      expect(getHeatColor(79, 21)?.bg).toBe('rgb(139, 195, 74)');
    });

    it('greens exactly 80%', () => {
      expect(getHeatColor(80, 20)?.bg).toBe('rgb(61, 145, 64)');
    });

    it('greens 100%', () => {
      expect(getHeatColor(10, 0)?.bg).toBe('rgb(61, 145, 64)');
    });
  });

  describe('confidence', () => {
    it('is near grey after one game', () => {
      expect(getHeatColor(1, 0)?.bg).toBe('rgb(135, 151, 135)');
    });

    it('climbs at two games', () => {
      expect(getHeatColor(2, 0)?.bg).toBe('rgb(116, 150, 117)');
    });

    it('climbs at three games', () => {
      expect(getHeatColor(3, 0)?.bg).toBe('rgb(98, 148, 100)');
    });

    it('climbs at four games', () => {
      expect(getHeatColor(4, 0)?.bg).toBe('rgb(79, 147, 82)');
    });

    it('is full at five games', () => {
      expect(getHeatColor(5, 0)?.bg).toBe('rgb(61, 145, 64)');
    });

    it('does not keep climbing past five', () => {
      expect(getHeatColor(12, 0)?.bg).toBe(getHeatColor(5, 0)?.bg);
    });

    it('greys a losing record just the same', () => {
      expect(getHeatColor(0, 1)?.bg).toBe('rgb(166, 139, 138)');
    });
  });

  it('always asks for dark text', () => {
    expect(getHeatColor(0, 1)?.fg).toBe('#333');
    expect(getHeatColor(10, 0)?.fg).toBe('#333');
    expect(getHeatColor(5, 5)?.fg).toBe('#333');
  });
});
