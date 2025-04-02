import React from 'react';
import { Box, Paper, Typography, Avatar, Stack } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSender } from '@/types/ai';

interface ChatBubbleProps {
  content: string;
  sender: MessageSender;
  timestamp?: string;
  avatarSrc?: string;
  senderName?: string;
  isLastMessage?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  content,
  sender,
  timestamp,
  avatarSrc,
  senderName,
  isLastMessage = false
}) => {
  const isAI = sender === MessageSender.AI;
  const isUser = sender === MessageSender.USER;
  const isSystem = sender === MessageSender.SYSTEM;

  // For system messages, display centered differently
  if (isSystem) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center',
          my: 2,
          animation: 'fadeIn 0.3s ease-in-out',
          '@keyframes fadeIn': {
            '0%': {
              opacity: 0,
              transform: 'translateY(10px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)'
            }
          }
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: 'info.main',
            color: 'info.contrastText',
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2">{content}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Stack 
      direction="row" 
      spacing={2} 
      justifyContent={isAI ? 'flex-start' : 'flex-end'} 
      alignItems="flex-start"
      sx={{ 
        mb: 2,
        animation: isLastMessage ? 'fadeIn 0.3s ease-in-out' : 'none',
        '@keyframes fadeIn': {
          '0%': {
            opacity: 0,
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        }
      }}
    >
      {/* AI avatar on the left */}
      {isAI && (
        <Avatar 
          alt={senderName || 'AI'} 
          src={avatarSrc || '/ai-avatar.png'} 
          sx={{ 
            alignSelf: 'flex-start',
            mt: 1,
            bgcolor: 'primary.main',
            width: 32,
            height: 32,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {!avatarSrc && 'AI'}
        </Avatar>
      )}
      
      {/* Bubble Container */}
      <Box sx={{ maxWidth: '70%' }}>
        {/* Sender name for AI messages */}
        {isAI && senderName && (
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 1, 
              color: 'text.secondary',
              fontWeight: 500
            }}
          >
            {senderName}
          </Typography>
        )}
        
        <Paper 
          elevation={1}
          sx={{
            p: 2,
            borderRadius: isAI ? '12px 12px 12px 0' : '12px 12px 0 12px',
            // Different styling for AI vs user messages
            backgroundColor: isAI ? 'grey.100' : 'primary.main',
            color: isAI ? 'text.primary' : 'primary.contrastText',
            // Special border for AI messages
            ...(isAI && {
              borderLeft: '4px solid',
              borderColor: 'primary.main',
            }),
            // Add subtle hover effect
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transform: 'scale(1.01)'
            }
          }}
        >
          {/* Support markdown for AI messages */}
          {isAI ? (
            <Box sx={{ 
              '& a': { 
                color: 'primary.main',
                textDecoration: 'none',
                fontWeight: 500,
                '&:hover': { textDecoration: 'underline' }
              },
              '& pre': { 
                backgroundColor: 'background.paper', 
                p: 1.5, 
                borderRadius: 1,
                overflowX: 'auto',
                my: 1.5
              },
              '& code': {
                fontFamily: 'monospace',
                backgroundColor: 'background.paper',
                px: 0.5,
                borderRadius: 0.5,
              },
              '& ul, & ol': { pl: 2, my: 1 },
              '& img': { maxWidth: '100%', borderRadius: 1, my: 1 },
              '& blockquote': {
                borderLeft: '4px solid',
                borderColor: 'divider',
                pl: 1.5,
                py: 0.5,
                my: 1,
                fontStyle: 'italic',
                color: 'text.secondary'
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                mt: 2,
                mb: 1
              },
              '& p': {
                my: 0.5
              }
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </Typography>
          )}
        </Paper>
        
        {/* Timestamp */}
        {timestamp && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mt: 0.5,
              color: 'text.secondary',
              textAlign: isAI ? 'left' : 'right',
              mx: 1,
              fontSize: '0.7rem'
            }}
          >
            {timestamp}
          </Typography>
        )}
      </Box>

      {/* User avatar on the right */}
      {isUser && (
        <Avatar 
          alt={senderName || 'You'} 
          src={avatarSrc} 
          sx={{ 
            alignSelf: 'flex-start',
            mt: 1,
            bgcolor: 'secondary.main',
            width: 32,
            height: 32,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {!avatarSrc && 'You'}
        </Avatar>
      )}
    </Stack>
  );
};

export default ChatBubble; 