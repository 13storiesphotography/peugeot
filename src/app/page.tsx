import { VehicleDashboard } from "@/components/VehicleDashboard";
import { createVehicleClient } from "@/lib/stellantis/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const client = createVehicleClient();
  const vehicle = await client.getStatus();

  return (
    <main className="min-h-full">
      <VehicleDashboard initial={vehicle} />
    </main>
  );
}
