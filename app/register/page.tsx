import SiteHeader from "@/components/SiteHeader";
import RegisterForm from "@/components/RegisterForm";
import { getSetting } from "@/lib/queries/settings";

export const metadata = { title: "Devenir Passerelle MQTT — MeshForge" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const onboarding = await getSetting("mqtt_onboarding");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader active="/register" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h2 className="mb-1 text-xl font-semibold">Devenir passerelle MQTT</h2>
        <p className="mb-6 text-sm text-muted">
          Enregistre ton node pour qu’il publie sa télémétrie vers MeshForge. Tu
          recevras des identifiants MQTT à configurer sur ton appareil.
        </p>
        <RegisterForm onboarding={onboarding} />
      </main>
    </div>
  );
}
