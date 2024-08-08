import type { AppProps } from 'next/app';
import { UserAuthBuilderProvider } from "../context/context";
import AuthStateWrapper from "@/components/Auth/AuthStateWrapper";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserAuthBuilderProvider>
      <AuthStateWrapper>
        <Component {...pageProps} />
      </AuthStateWrapper>
    </UserAuthBuilderProvider>
  );
}
