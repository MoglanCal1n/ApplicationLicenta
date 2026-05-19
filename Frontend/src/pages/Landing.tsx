import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Mic, FileText, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Decorative top red bar */}
      <div className="h-1 bg-primary w-full" />
      
      <nav className="border-b px-6 py-4 flex justify-between items-center bg-card shadow-sm relative overflow-hidden">
        {/* Subtle red background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Stethoscope className="text-primary h-6 w-6" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            E-Health AI
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm font-semibold hover:text-primary transition-colors py-2">
            Login
          </Link>
          <Link to="/register" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
          The Future of <span className="text-primary relative inline-block">
            Medical Consultations
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-primary/30 rounded-full" />
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Empowering doctors with AI-driven voice transcription, automated entity extraction, and instant digital medical reports.
        </p>
        
        <div className="flex gap-4 mb-24">
          <Link to="/register" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1">
            Create an Account <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="p-8 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-300 group border-primary/10 hover:border-primary/30">
            <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Voice to Text</h3>
            <p className="text-muted-foreground leading-relaxed">Record consultations directly in the browser and let our advanced Hybrid AI transcribe them instantly.</p>
          </div>
          
          <div className="p-8 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-300 group border-primary/10 hover:border-primary/30 relative overflow-hidden">
            <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Smart Extraction</h3>
            <p className="text-muted-foreground leading-relaxed">Automatically extract Symptoms, Diagnoses, and Medications using integrated large language models.</p>
          </div>
          
          <div className="p-8 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-300 group border-primary/10 hover:border-primary/30">
            <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">PDF Reports</h3>
            <p className="text-muted-foreground leading-relaxed">Digitally sign consultations and automatically generate structured, professional PDF medical reports.</p>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-6 text-center text-muted-foreground text-sm">
        &copy; 2026 Moglan Calin-Stefan. All rights reserved.
      </footer>
    </div>
  );
}
