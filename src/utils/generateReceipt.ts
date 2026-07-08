import { jsPDF } from "jspdf";
import { Student, Payment, Class, Campus, SchoolConfig } from "../types";

/** Format a number with dot as thousands separator (e.g. 180000 → 180.000) */
function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/\s/g, ".") + " FCFA";
}

/** Helper to load an image asynchronously */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export async function generateReceipt(
  student: Student,
  payment: Payment,
  selectedClass?: Class,
  selectedCampus?: Campus,
  schoolConfig?: SchoolConfig | null
) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5" // Standard receipt size
    });

    // Color presets matching schoolConfig.themeColor
    const themeColorMap: Record<string, [number, number, number]> = {
      blue: [37, 99, 235],      // Blue 600
      emerald: [16, 185, 129],  // Emerald 600
      rose: [244, 63, 94],      // Rose 600
      amber: [245, 158, 11],     // Amber 500
      slate: [55, 65, 81]       // Slate 700
    };

    const primaryColor = themeColorMap[schoolConfig?.themeColor || "blue"];
    const textColor = [30, 41, 59]; // Slate 800
    const mutedColor = [100, 116, 139]; // Slate 500

    // Load school logo if available
    let logoImg: HTMLImageElement | null = null;
    if (schoolConfig?.logoUrl) {
      try {
        logoImg = await loadImage(schoolConfig.logoUrl);
      } catch (err) {
        console.warn("Could not load logo for watermark/header:", err);
      }
    }

    // ── WATERMARK: school logo centered, low opacity ──
    if (logoImg) {
      try {
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logoImg, "PNG", 35, 60, 75, 75);
        doc.restoreGraphicsState();
      } catch (_) {
        // Silently fallback if image error
      }
    }

    // Frame Border
    doc.setDrawColor(226, 232, 240);
    doc.rect(4, 4, 140, 202);

    // Decorative Primary Bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(4, 4, 140, 4, "F");

    // Header Logo and Slogan
    const schoolName = schoolConfig?.name || "ÉCOLE DE LANGUES";
    const sloganText = schoolConfig?.slogan || "L'excellence linguistique à votre portée";

    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", 10, 10, 12, 12);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(schoolName.toUpperCase(), 25, 16);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sloganText, 25, 21);
      } catch (e) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(schoolName.toUpperCase(), 10, 18);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sloganText, 10, 23);
      }
    } else {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(schoolName.toUpperCase(), 10, 18);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sloganText, 10, 23);
    }

    // School Location and Contact details (right-aligned)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(selectedCampus ? selectedCampus.name : "Campus Principal", 144, 15, { align: "right" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(selectedCampus ? selectedCampus.address : "Douala, Cameroun", 144, 19, { align: "right" });
    
    // Add Email contact of the school if configured
    if (schoolConfig?.id) {
      doc.text(`Contact: info@linguainscript.com`, 144, 23, { align: "right" });
    }

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 28, 138, 28);

    // Receipt Metadata
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("REÇU DE PAIEMENT", 10, 36);

    const receiptNum = `REC-${new Date().getFullYear()}-${payment.id.substr(payment.id.length - 4).toUpperCase()}`;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`N°: ${receiptNum}`, 10, 42);

    doc.setFont("Helvetica", "normal");
    doc.text(`Date d'émission : ${new Date(payment.date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })}`, 10, 47);

    // Student & Class Info Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 53, 128, 42, "F");
    doc.setDrawColor(241, 245, 249);
    doc.rect(10, 53, 128, 42, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INFORMATIONS ÉTUDIANT", 14, 60);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nom : ${student.firstName.toUpperCase()} ${student.lastName.toUpperCase()}`, 14, 67);
    doc.text(`Contact : ${student.phone}`, 14, 73);

    doc.setFont("Helvetica", "normal");
    doc.text(`Parent : ${student.parentName} (${student.parentPhone})`, 14, 79);

    const classLabel = selectedClass 
      ? `Cours : ${selectedClass.language} ${selectedClass.level} [période ${selectedClass.period}]`
      : "Cours : Non assigné";
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(classLabel, 14, 87);

    // Payment break-down Table
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("DÉTAIL DU RÈGLEMENT", 10, 107);

    // Table headers
    doc.setFillColor(241, 245, 249);
    doc.rect(10, 111, 128, 7, "F");

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Description", 14, 116);
    doc.text("Mode", 70, 116);
    doc.text("Montant", 134, 116, { align: "right" });

    // Table content
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const desc = payment.note || "Frais d'inscription scolaire";
    doc.text(desc.length > 35 ? desc.substring(0, 35) + "..." : desc, 14, 125);
    doc.text(payment.mode, 70, 125);
    doc.setFont("Helvetica", "bold");
    doc.text(formatFCFA(payment.amount), 134, 125, { align: "right" });

    doc.setDrawColor(241, 245, 249);
    doc.line(10, 129, 138, 129);

    // Calculate totals
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Frais de scolarité totaux :", 80, 137, { align: "right" });
    doc.text(formatFCFA(student.totalAmount), 134, 137, { align: "right" });

    doc.text("Total réglé à ce jour :", 80, 143, { align: "right" });
    doc.setTextColor(16, 185, 129); // Green text for paid
    doc.text(formatFCFA(student.paidAmount), 134, 143, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Reste à recouvrer (Solde) :", 80, 150, { align: "right" });
    if (student.balance > 0) {
      doc.setTextColor(239, 68, 68); // Red text for balance
    }
    doc.text(formatFCFA(student.balance), 134, 150, { align: "right" });

    // Expiration Details
    doc.setDrawColor(241, 245, 249);
    doc.line(10, 156, 138, 156);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Période de validité de l'inscription :`, 10, 163);
    doc.setFont("Helvetica", "semibold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Du ${new Date(student.enrollmentDate).toLocaleDateString("fr-FR")} au ${new Date(student.expirationDate).toLocaleDateString("fr-FR")}`, 10, 167);

    // Signatures
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reçu encaissé par : ${payment.recordedBy.userName}`, 10, 178);

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Signature et Cachet de l'École", 90, 178);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(90, 194, 138, 194);

    // Terms
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Ce reçu fait foi d'inscription officielle et de validation de paiement.", 74, 201, { align: "center" });

    // Download the PDF file directly
    const normalizedFirstName = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const normalizedLastName = student.lastName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const receiptFileName = `recu_${receiptNum}_${normalizedFirstName}_${normalizedLastName}.pdf`;
    doc.save(receiptFileName);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF", error);
  }
}
