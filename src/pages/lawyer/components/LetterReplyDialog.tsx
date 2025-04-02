import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Check, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LetterReplyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    documentId: string;
    selectedModel: string;
}

interface AnalysisState {
    status: string;
    document_name: string;
    analysis: {
        summary: string;
        key_points: string[];
        legal_context: any[];
    };
}

interface ResponseOption {
    approach: string;
    description: string;
    benefits: string[];
    risks: string[];
    draft_text: string;
}

export function LetterReplyDialog({
    isOpen,
    onClose,
    clientId,
    documentId,
    selectedModel
}: LetterReplyDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [responseChoices, setResponseChoices] = useState<Record<string, string>>({});
    const [finalLetter, setFinalLetter] = useState<string | null>(null);

    // Initialize the process
    const startAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/letters/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    client_id: clientId,
                    document_id: documentId,
                    model: selectedModel,
                    action: 'analyze'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail?.message || 'Failed to analyze letter');
            }

            const data = await response.json();
            setAnalysis(data);
            setStep(2);
        } catch (err) {
            setError(err.message);
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle response choice for current point
    const handleResponseChoice = (pointIndex: number, choice: string) => {
        setResponseChoices(prev => ({
            ...prev,
            [pointIndex]: choice
        }));
    };

    // Generate final letter
    const generateFinalLetter = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/letters/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    client_id: clientId,
                    document_id: documentId,
                    model: selectedModel,
                    action: 'generate',
                    response_choices: responseChoices
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail?.message || 'Failed to generate letter');
            }

            const data = await response.json();
            setFinalLetter(data.letter_content);
            setStep(4);
        } catch (err) {
            setError(err.message);
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            This will analyze the selected letter and help you draft a response.
                        </p>
                        <Button 
                            onClick={startAnalysis}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>Start Analysis</>
                            )}
                        </Button>
                    </div>
                );

            case 2:
                return analysis ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Letter Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700">{analysis.analysis.summary}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Key Points to Address</CardTitle>
                                <CardDescription>
                                    Review the key points identified in the letter.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analysis.analysis.key_points.map((point, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm">
                                                {index + 1}
                                            </div>
                                            <p className="text-gray-700">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Button onClick={() => setStep(3)}>
                            Choose Response Approaches
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                ) : null;

            case 3:
                return analysis ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Choose Response Approach</CardTitle>
                                <CardDescription>
                                    Point {currentPointIndex + 1} of {analysis.analysis.key_points.length}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4">
                                    <h3 className="font-medium mb-2">Current Point:</h3>
                                    <p className="text-gray-700">{analysis.analysis.key_points[currentPointIndex]}</p>
                                </div>

                                <RadioGroup
                                    value={responseChoices[currentPointIndex] || ''}
                                    onValueChange={(value) => handleResponseChoice(currentPointIndex, value)}
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <RadioGroupItem value="conciliatory" id="conciliatory" />
                                            <Label htmlFor="conciliatory">Conciliatory Approach</Label>
                                            <p className="text-gray-600 text-sm ml-6">
                                                Agreeable and cooperative response
                                            </p>
                                        </div>
                                        <div>
                                            <RadioGroupItem value="firm" id="firm" />
                                            <Label htmlFor="firm">Firm Approach</Label>
                                            <p className="text-gray-600 text-sm ml-6">
                                                Professional but assertive response
                                            </p>
                                        </div>
                                        <div>
                                            <RadioGroupItem value="clarification" id="clarification" />
                                            <Label htmlFor="clarification">Request Clarification</Label>
                                            <p className="text-gray-600 text-sm ml-6">
                                                Ask for more information or clarification
                                            </p>
                                        </div>
                                    </div>
                                </RadioGroup>

                                <div className="flex justify-between mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPointIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentPointIndex === 0}
                                    >
                                        Previous Point
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (currentPointIndex < analysis.analysis.key_points.length - 1) {
                                                setCurrentPointIndex(prev => prev + 1);
                                            } else {
                                                generateFinalLetter();
                                            }
                                        }}
                                        disabled={!responseChoices[currentPointIndex]}
                                    >
                                        {currentPointIndex < analysis.analysis.key_points.length - 1 ? (
                                            <>Next Point</>
                                        ) : (
                                            <>Generate Letter</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null;

            case 4:
                return finalLetter ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Generated Response</CardTitle>
                                <CardDescription>
                                    Review the generated response letter.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px]">
                                    <div className="whitespace-pre-wrap text-gray-700">
                                        {finalLetter}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <Button onClick={() => {
                                // Copy to clipboard
                                navigator.clipboard.writeText(finalLetter);
                                toast({
                                    title: "Copied to clipboard",
                                    description: "The letter has been copied to your clipboard.",
                                });
                            }}>
                                Copy to Clipboard
                            </Button>
                        </div>
                    </div>
                ) : null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Reply to Legal Letter</DialogTitle>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {renderStep()}
            </DialogContent>
        </Dialog>
    );
} 