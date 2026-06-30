import { google } from 'googleapis';
import { env } from '../config/env';
import { logger } from '../config/logger';

const isMockMode = !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.startsWith('mock_');

export const getGoogleOAuthClient = () => {
  if (isMockMode) {
    return null;
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${env.API_URL}/api/v1/calendar/callback`
  );
};

export const getAuthUrl = (userId: string) => {
  if (isMockMode) {
    // In mock mode, just redirect straight back with a fake code and state
    return `${env.API_URL}/api/v1/calendar/callback?code=mock_auth_code_123&state=${userId}`;
  }

  const oauth2Client = getGoogleOAuthClient()!;
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: userId,
    prompt: 'consent' // Force to get refresh token
  });
};

export const exchangeCodeForTokens = async (code: string): Promise<{
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };
  email: string;
}> => {
  if (isMockMode || code.startsWith('mock_')) {
    return {
      tokens: {
        access_token: 'mock_access_token_abc123',
        refresh_token: 'mock_refresh_token_def456',
        expiry_date: Date.now() + 3600 * 1000,
      },
      email: 'mock.user@example.com'
    };
  }

  const oauth2Client = getGoogleOAuthClient()!;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    tokens,
    email: userInfo.data.email || 'unknown@example.com'
  };
};

export const fetchCalendarEvents = async (accessToken: string, refreshToken: string | null) => {
  if (isMockMode || accessToken.startsWith('mock_')) {
    // Return some mock events for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0); // 10 AM
    
    return [
      {
        id: 'mock_event_1',
        summary: 'Mock Team Standup',
        start: { dateTime: startOfDay.toISOString() },
        end: { dateTime: endOfDay.toISOString() },
        status: 'confirmed'
      }
    ];
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  } catch (error) {
    logger.error('Failed to fetch calendar events', error);
    throw error;
  }
};

export const createCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null,
  event: { summary: string; description?: string; startTime: string; endTime: string }
) => {
  if (isMockMode || accessToken.startsWith('mock_')) {
    return { id: 'mock_event_created_' + Math.random().toString(36).substring(2, 9) };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${env.API_URL}/api/v1/calendar/callback`
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
      },
    });
    return res.data;
  } catch (error) {
    logger.error('Failed to create calendar event', error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null,
  eventId: string,
  event: { summary: string; description?: string; startTime: string; endTime: string }
) => {
  if (isMockMode || accessToken.startsWith('mock_')) {
    return { id: eventId };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${env.API_URL}/api/v1/calendar/callback`
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
      },
    });
    return res.data;
  } catch (error) {
    logger.error('Failed to update calendar event', error);
    throw error;
  }
};

export const deleteCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null,
  eventId: string
) => {
  if (isMockMode || accessToken.startsWith('mock_')) {
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${env.API_URL}/api/v1/calendar/callback`
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  } catch (error) {
    logger.error('Failed to delete calendar event', error);
    throw error;
  }
};
