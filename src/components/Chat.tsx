import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: string;
  content: string;
}

export const Chat = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-lg ${
            message.role === 'system' ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}; 