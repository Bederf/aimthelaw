import React from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import GavelIcon from '@mui/icons-material/Gavel';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FeedbackForm from './FeedbackForm';
import { Message, MessageRole, MessageSender } from '@/types/chat';

interface ChatPanelProps {
  messages: Message[];
  inputMessage: string;
  loading: boolean;
  isAwaitingFeedback: boolean;
  workflowQuestions: any[];
  quickActionsOpen: boolean;
  quickActionLoading: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  selectedFiles: string[];
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  toggleQuickActions: () => void;
  handleQuickAction: (action: string) => void;
  handleFeedbackSubmit: (answers: any) => void;
  handleFeedbackCancel: () => void;
}

export function ChatPanel({
  messages,
  inputMessage,
  loading,
  isAwaitingFeedback,
  workflowQuestions,
  quickActionsOpen,
  quickActionLoading,
  messagesEndRef,
  selectedFiles,
  setInputMessage,
  handleSendMessage,
  toggleQuickActions,
  handleQuickAction,
  handleFeedbackSubmit,
  handleFeedbackCancel,
}: ChatPanelProps) {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2
      }}
    >
      {/* Display feedback form when awaiting feedback */}
      {isAwaitingFeedback && workflowQuestions.length > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 10, 
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4
        }}>
          <FeedbackForm
            questions={workflowQuestions}
            onSubmit={handleFeedbackSubmit}
            onCancel={handleFeedbackCancel}
          />
        </Box>
      )}
      
      {/* Header with Quick Actions toggle */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" fontWeight="medium">AI Assistant Chat</Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={toggleQuickActions}
          startIcon={<FormatListBulletedIcon />}
        >
          {quickActionsOpen ? "Hide Quick Actions" : "Show Quick Actions"}
        </Button>
      </Box>
      
      {/* Quick Actions Panel */}
      {quickActionsOpen && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium" mb={1.5}>
              Quick Actions
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)'
              },
              gap: 1 
            }}>
              <Button 
                variant="outlined" 
                sx={{ 
                  justifyContent: 'flex-start', 
                  textTransform: 'none',
                  height: 38
                }}
                startIcon={<CalendarMonthIcon />}
                onClick={() => handleQuickAction('Extract Dates')}
                disabled={quickActionLoading !== null || selectedFiles.length === 0}
              >
                Extract Dates
              </Button>
              <Button 
                variant="outlined" 
                sx={{ 
                  justifyContent: 'flex-start', 
                  textTransform: 'none',
                  height: 38
                }}
                startIcon={<InsertDriveFileIcon />}
                onClick={() => handleQuickAction('Summarize Document')}
                disabled={quickActionLoading !== null || selectedFiles.length === 0}
              >
                Summarize Document
              </Button>
              <Button 
                variant="outlined" 
                sx={{ 
                  justifyContent: 'flex-start', 
                  textTransform: 'none',
                  height: 38
                }}
                startIcon={<InsertDriveFileIcon />}
                onClick={() => handleQuickAction('reply_to_letter')}
                disabled={quickActionLoading !== null}
              >
                Reply to Letter
              </Button>
              <Button 
                variant="outlined" 
                sx={{ 
                  justifyContent: 'flex-start', 
                  textTransform: 'none',
                  height: 38
                }}
                startIcon={<GavelIcon />}
                onClick={() => handleQuickAction('prepare_court_case')}
                disabled={quickActionLoading !== null}
              >
                Prepare Court Case
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Messages display - Conversation Area */}
      <Box sx={{ 
        flex: 1, 
        p: 3, 
        overflowY: 'auto',
        bgcolor: 'background.default'
      }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            py: 6, 
            textAlign: 'center'
          }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                backgroundColor: 'primary.light', 
                mb: 3 
              }}
            >
              <PsychologyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" mb={1}>
              Welcome to AI Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3} sx={{ maxWidth: 500 }}>
              Select documents from the sidebar and ask questions or use quick actions to analyze your legal documents.
            </Typography>
            <Button 
              variant="outlined"
              onClick={toggleQuickActions}
              startIcon={<FormatListBulletedIcon />}
            >
              View Quick Actions
            </Button>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ maxWidth: '900px', mx: 'auto' }}>
            {messages.map((message) => (
              <Box 
                key={message.id} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.sender === MessageSender.AI ? 'flex-start' : 
                                  message.sender === MessageSender.USER ? 'flex-end' : 'center'
                }}
              >
                <Paper 
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    maxWidth: message.sender === MessageSender.SYSTEM ? '80%' : '70%',
                    backgroundColor: message.sender === MessageSender.AI ? 'grey.100' : 
                                    message.sender === MessageSender.USER ? 'primary.main' : 'grey.200',
                    color: message.sender === MessageSender.USER ? 'primary.contrastText' : 'text.primary',
                    borderLeft: message.sender === MessageSender.AI ? '4px solid' : 'none',
                    borderColor: message.sender === MessageSender.AI ? 'primary.main' : 'transparent',
                  }}
                >
                  {typeof message.content === 'string' ? (
                    message.sender === MessageSender.AI ? (
                      <Box sx={{ 
                        '& a': { color: 'primary.main' },
                        '& pre': { 
                          backgroundColor: 'background.paper', 
                          p: 1.5, 
                          borderRadius: 1,
                          overflowX: 'auto'
                        },
                        '& code': {
                          fontFamily: 'monospace',
                          backgroundColor: 'background.paper',
                          px: 0.5,
                          borderRadius: 0.5,
                        },
                        '& ul, & ol': { pl: 2 },
                        '& img': { maxWidth: '100%' }
                      }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </Box>
                    ) : (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                    )
                  ) : (
                    <Typography>Content not available</Typography>
                  )}
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>
      
      {/* Input area - Fixed at bottom */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider', 
        bgcolor: 'background.paper'
      }}>
        <Stack 
          direction="row" 
          spacing={1}
          component="form" 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          sx={{ 
            maxWidth: 900,
            mx: 'auto'
          }}
        >
          <TextField
            fullWidth
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            size="small"
            disabled={loading}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !inputMessage.trim()}
            sx={{ borderRadius: 2, minWidth: 50 }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon />
            )}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
} 