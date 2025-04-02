import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackFormProps {
  questions: string[];
  onSubmit: (answers: string[]) => void;
  onCancel: () => void;
}

/**
 * Component for collecting feedback from the lawyer when the workflow is awaiting input.
 * Displays questions and collects answers for interactive letter reply.
 */
export function FeedbackForm({ questions, onSubmit, onCancel }: FeedbackFormProps) {
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  
  const allQuestionsAnswered = answers.every(answer => answer.trim().length > 0);
  
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };
  
  const handleSubmit = () => {
    if (allQuestionsAnswered) {
      onSubmit(answers);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto my-4">
      <CardHeader>
        <CardTitle>Please provide your input</CardTitle>
        <CardDescription>
          Your answers will help us generate a more accurate and tailored letter response.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`question-${index}`} className="font-medium text-sm">
              {question}
            </Label>
            <Textarea
              id={`question-${index}`}
              value={answers[index]}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[100px]"
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!allQuestionsAnswered}
        >
          Submit Feedback
        </Button>
      </CardFooter>
    </Card>
  );
}

export default FeedbackForm; 