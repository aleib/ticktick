import { Link } from "react-router-dom";
import { Button } from "../components/ui/button.js";

export function NotFound() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Page not found</p>
      <Button asChild>
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
}

