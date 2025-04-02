
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Scale, Calendar, FileText, Bot, CheckCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const features = [
    {
      title: "Document Analysis",
      description: "Extract key insights from legal documents automatically",
      icon: FileText
    },
    {
      title: "Legal Research Assistant",
      description: "AI-powered research that finds relevant precedents and statutes",
      icon: Bot
    },
    {
      title: "Date Extraction",
      description: "Identify critical dates and deadlines from complex legal materials",
      icon: Calendar
    },
    {
      title: "Response Generation",
      description: "Draft professional responses to legal correspondence",
      icon: Scale
    }
  ];

  const specialties = [
    "Family Law", "Corporate Law", "Real Estate", "Intellectual Property", 
    "Employment Law", "Immigration", "Personal Injury", "Criminal Defense"
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Scale className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold">Legal AI Assistant</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#specialties" className="text-gray-600 hover:text-blue-600 transition-colors">Specialties</a>
            <a href="#benefits" className="text-gray-600 hover:text-blue-600 transition-colors">Benefits</a>
            <Link to="/login">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Transform Your Legal Practice with AI
              </h1>
              <p className="text-lg md:text-xl mb-8 text-blue-100">
                Streamline document review, extract key insights, and deliver better client outcomes with our advanced legal AI assistant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-700">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-white/20">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-blue-300/50 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-blue-300/30 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <div className="h-2 bg-blue-300/50 rounded w-full mb-2"></div>
                    <div className="h-2 bg-blue-300/50 rounded w-5/6"></div>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <div className="h-2 bg-blue-300/50 rounded w-full mb-2"></div>
                    <div className="h-2 bg-blue-300/50 rounded w-4/6"></div>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <div className="h-2 bg-blue-300/50 rounded w-full mb-2"></div>
                    <div className="h-2 bg-blue-300/50 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Legal AI Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section id="specialties" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Specialized for All Legal Practices</h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Our AI assistant is trained on diverse legal domains to provide accurate and relevant assistance for any specialty.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {specialties.map((specialty, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                <span>{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 bg-gradient-to-br from-blue-50 via-blue-100 to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Legal AI Assistant</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Save Time</h3>
              <p className="text-gray-600">
                Reduce document review time by up to 70% with AI-powered analysis and extraction of key information.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Increase Accuracy</h3>
              <p className="text-gray-600">
                Minimize human error and ensure comprehensive analysis with AI that never misses important details.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Enhance Client Service</h3>
              <p className="text-gray-600">
                Provide faster responses, more thorough analysis, and better outcomes for your clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Legal Practice?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of legal professionals already using our AI assistant to work smarter and deliver better results.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Scale className="h-6 w-6 text-blue-400 mr-2" />
                <span className="text-lg font-bold text-white">Legal AI Assistant</span>
              </div>
              <p className="text-sm">
                Advanced AI technology for the modern legal practice.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Document Analysis</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Legal Research</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Date Extraction</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Response Generation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} Legal AI Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
