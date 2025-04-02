import React, { useCallback, useEffect } from 'react';

// Restore messages from backup after a page refresh during quick action
const restoreMessagesFromBackup = useCallback(() => {
  // Check if we're recovering from a quick action refresh
  const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
 