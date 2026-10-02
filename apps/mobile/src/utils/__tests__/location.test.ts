import * as Location from 'expo-location';
import { getCurrentCoordinates } from '../location';
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(), hasServicesEnabledAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), Accuracy: { Balanced: 3 },
}));
jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
const permission = Location.requestForegroundPermissionsAsync as jest.Mock;
const services = Location.hasServicesEnabledAsync as jest.Mock;
const position = Location.getCurrentPositionAsync as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); permission.mockResolvedValue({ granted: true }); services.mockResolvedValue(true); });
it('returns the actual position', async () => {
  position.mockResolvedValue({ coords: { latitude: 48, longitude: 2 } });
  await expect(getCurrentCoordinates()).resolves.toEqual({ latitude: 48, longitude: 2 });
});
it('rejects denied permission without asking the GPS', async () => {
  permission.mockResolvedValue({ granted: false });
  await expect(getCurrentCoordinates()).rejects.toThrow('permission');
  expect(position).not.toHaveBeenCalled();
});
it('bounds GPS waits and clears its timer', async () => {
  jest.useFakeTimers(); position.mockReturnValue(new Promise(() => {}));
  const request = getCurrentCoordinates();
  const assertion = expect(request).rejects.toThrow('timeout');
  await jest.advanceTimersByTimeAsync(20000);
  await assertion; expect(jest.getTimerCount()).toBe(0); jest.useRealTimers();
});
