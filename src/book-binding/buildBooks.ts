import buildPDF from "./_buildPDF.ts";
import buildEPUB from "./_buildEPUB.ts";
import buildKindle from "./_buildKindle.ts";


for (const builder of [buildPDF, buildEPUB, buildKindle]) {
  const success = await builder();
  if (!success) {
    Deno.exit(1);
  }
}
