import PrimaryLayout from "@/layout/PrimaryLayout/PrimaryLayout";
import MapWorld3 from "@/components/MapWorld3/MapWorld3";
import AuthStateWrapper from "@/components/Auth/AuthStateWrapper";
import { UserAuthBuilderProvider } from "../../context/context";

export default function Home() {
  return (
    <UserAuthBuilderProvider>
    <AuthStateWrapper>
        <PrimaryLayout>
          <MapWorld3 />
        </PrimaryLayout>
    </AuthStateWrapper>
    </UserAuthBuilderProvider>
  );
}
