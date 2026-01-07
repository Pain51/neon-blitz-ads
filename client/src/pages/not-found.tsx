import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-24 w-24 text-destructive animate-pulse" />
        </div>
        <h1 className="font-arcade text-4xl text-white">404 ERROR</h1>
        <p className="text-muted-foreground font-mono">SECTOR NOT FOUND</p>
        
        <Link href="/" className="inline-block mt-8">
          <span className="px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-white font-arcade text-sm cursor-pointer transition-colors">
            RETURN TO BASE
          </span>
        </Link>
      </div>
    </div>
  );
}
