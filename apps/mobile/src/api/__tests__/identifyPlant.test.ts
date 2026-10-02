import { FunctionsHttpError } from '@supabase/supabase-js';
import { identifyPlant } from '../identifyPlant';
import { supabase, uriToImageDataUrl } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
  uriToImageDataUrl: jest.fn(),
}));
jest.mock('@/api/adapters', () => ({
  toPlantWithIcon: (id: string) => ({ id }),
}));

const invoke = supabase.functions.invoke as jest.Mock;
const encode = uriToImageDataUrl as jest.Mock;
const imageBase64 = 'data:image/jpeg;base64,/9j/';

describe('plant identification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends camera JPEG data directly without rereading the native file', async () => {
    invoke.mockResolvedValue({ data: { plantId: 'plant-1', confiance: 87, xpGagne: 25 }, error: null });
    await expect(identifyPlant({ photoUri: 'file:///photo.jpg', imageBase64 })).resolves.toEqual({
      plant: { id: 'plant-1' }, confidence: 87, xpAwarded: 25,
    });
    expect(invoke).toHaveBeenCalledWith('identify-plant', { body: { imageBase64 } });
    expect(encode).not.toHaveBeenCalled();
  });

  it('falls back to reading the photo if camera data is unavailable', async () => {
    encode.mockResolvedValue(imageBase64);
    invoke.mockResolvedValue({ data: { plantId: 'plant-1' }, error: null });
    await identifyPlant({ photoUri: 'file:///photo.jpg' });
    expect(encode).toHaveBeenCalledWith('file:///photo.jpg');
    expect(invoke).toHaveBeenCalledWith('identify-plant', { body: { imageBase64 } });
  });

  it.each([
    [503, { error: 'Clé Pl@ntNet absente' }, 'Clé Pl@ntNet absente'],
    [422, { error: 'Plante non reconnue' }, 'Plante non reconnue'],
    [401, { message: 'Invalid JWT' }, 'Invalid JWT'],
  ])('retains the response details for HTTP %s', async (status, body, message) => {
    const response = new Response(JSON.stringify(body), { status });
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) });
    await expect(identifyPlant({ photoUri: 'file:///photo.jpg', imageBase64 })).rejects.toMatchObject({
      message, status,
    });
  });

  it('retains the status for non-JSON errors', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response('Bad gateway', { status: 502 })) });
    await expect(identifyPlant({ photoUri: 'file:///photo.jpg', imageBase64 })).rejects.toMatchObject({ status: 502 });
  });
});
