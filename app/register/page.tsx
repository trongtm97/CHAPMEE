import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <section>
      <p className="page-kicker">Register</p>
      <h1 className="page-title">Create your reader account.</h1>
      <p className="page-copy">Build your shelf and comment on stories you love.</p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </section>
  );
}
