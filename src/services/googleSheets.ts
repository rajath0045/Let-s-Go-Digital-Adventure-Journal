import type { Quest } from './supabase';

// Dynamically load the Google Identity Services (GSI) script
export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services SDK loaded but not initialized.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK.'));
    document.head.appendChild(script);
  });
}

// Request access token from user via Google OAuth 2.0 popup
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`OAuth Error: ${response.error_description || response.error}`));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned.'));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(`OAuth initialization error: ${err.message}`));
        }
      });

      // Request token with interactive prompt
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error(`Token client creation failed: ${err.message}`));
    }
  });
}

// Export quests to a newly created Google Sheet
export async function exportToGoogleSheets(
  quests: Quest[],
  options: {
    scope: 'all' | 'pending' | 'completed' | 'date_range';
    startDate?: string;
    endDate?: string;
  },
  clientId: string
): Promise<string> {
  if (!clientId) {
    throw new Error('Google Client ID is required. Please set it in Settings.');
  }

  // 1. Filter quests based on options
  let filteredQuests = [...quests];

  if (options.scope === 'pending') {
    filteredQuests = quests.filter(q => q.status !== 'Completed');
  } else if (options.scope === 'completed') {
    filteredQuests = quests.filter(q => q.status === 'Completed');
  } else if (options.scope === 'date_range' && options.startDate && options.endDate) {
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);
    filteredQuests = quests.filter(q => {
      if (!q.quest_date) return false;
      const qDate = new Date(q.quest_date);
      return qDate >= start && qDate <= end;
    });
  }

  if (filteredQuests.length === 0) {
    throw new Error('No quests found matching the selected export options.');
  }

  // 2. Get Access Token
  const accessToken = await requestGoogleAccessToken(clientId);

  // 3. Create a new Spreadsheet
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      properties: {
        title: `QuestVault Adventures - ${dateStr}`
      }
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json();
    throw new Error(`Failed to create spreadsheet: ${errData.error?.message || createResponse.statusText}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 4. Format rows for Google Sheets
  const headers = [
    'Priority',
    'Quest Title',
    'Location',
    'Quest Date',
    'Lore Acquired / Notes',
    'Primary Photo URL',
    'Additional Photo URLs',
    'Instagram/YouTube Link',
    'Status',
    'Completion Date'
  ];

  const rows = filteredQuests.map(q => [
    q.priority,
    q.title,
    q.location || '',
    q.quest_date || '',
    q.lore_acquired || '',
    q.photo_url || '',
    (q.photo_urls || []).join(', '),
    q.media_link || '',
    q.status,
    q.completed_at ? new Date(q.completed_at).toLocaleDateString() : ''
  ]);

  // 5. Append data to spreadsheet
  const appendResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        values: [headers, ...rows]
      })
    }
  );

  if (!appendResponse.ok) {
    const errData = await appendResponse.json();
    throw new Error(`Failed to write quest data: ${errData.error?.message || appendResponse.statusText}`);
  }

  // 6. Return the URL
  return spreadsheetUrl;
}
