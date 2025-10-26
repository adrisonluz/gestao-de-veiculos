import { SignUpForm } from "@/components/signup-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crie uma Conta</CardTitle>
          <CardDescription>Insira seu e-mail e senha para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
