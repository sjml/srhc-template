import buildPDF from "./_buildPDF.js";
import buildEPUB from "./_buildEPUB.js";
import buildKindle from "./_buildKindle.js";


for (const builder of [buildPDF, buildEPUB, buildKindle]) {
  const success = await builder();
  if (!success) {
    process.exit(1);
  }
}
