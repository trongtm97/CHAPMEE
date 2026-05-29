import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <section>
      <p className="page-kicker">Login</p>
      <h1 className="page-title">Welcome back.</h1>
      <p className="page-copy">Save stories, follow creators, and join the conversation.</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
