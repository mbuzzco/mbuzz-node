import { postWithResponse } from '../api';
import { validateTrack } from './validation';
import { buildTrackPayload } from './payloads';
import type { TrackOptions, TrackResult } from './types';

export type { TrackResult } from './types';

interface EventsResponse {
  events: Array<{ id: string }>;
}

const parseResponse = (
  response: EventsResponse | null,
  options: TrackOptions
): TrackResult | false => {
  if (!response?.events?.[0]?.id) {
    return false;
  }

  return {
    success: true,
    eventId: response.events[0].id,
    eventType: options.eventType,
    visitorId: options.visitorId,
    sessionId: options.sessionId,
  };
};

export const track = async (options: TrackOptions): Promise<TrackResult | false> => {
  if (!validateTrack(options)) {
    return false;
  }

  const payload = buildTrackPayload(options);
  const response = await postWithResponse<EventsResponse>('/events', payload);

  return parseResponse(response, options);
};
