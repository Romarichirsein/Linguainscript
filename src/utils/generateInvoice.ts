import { jsPDF } from "jspdf";
import { Student, Class, Campus, SchoolConfig } from "../types";

export function generateInvoice(
  student: Student,
  selectedClass?: Class,
  selectedCampus?: Campus,
  paymentsList: any[] = [],
  schoolConfig?: SchoolConfig | null
) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4" // Invoices are standard on professional A4 sheets
    });

    // Theme Color map presets matching custom school branding
    const themeColorMap: Record<string, [number, number, number]> = {
      blue: [37, 99, 235],      // Blue 600
      emerald: [16, 185, 129],  // Emerald 600
      rose: [244, 63, 94],      // Rose 600
      amber: [245, 158, 11],     // Amber 500
      slate: [55, 65, 81]       // Slate 700
    };

    const primaryColor = themeColorMap[schoolConfig?.themeColor || "blue"];
    const textColor = [15, 23, 42]; // Slate 900
    const mutedColor = [100, 116, 139]; // Slate 500
    const lightBg = [248, 250, 252]; // Slate 50

    // Frame layout dimensions
    const marginX = 15;
    let currentY = 15;

    // Premium visual border line on top
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 6, "F");
    currentY += 10;

    // --- SCHOOL INFORMATION (HEADER LEFT) ---
    // School Custom Logo
    if (schoolConfig?.logoUrl) {
      try {
        doc.addImage(schoolConfig.logoUrl, "JPEG", marginX, currentY, 15, 15);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(schoolConfig.name || "LinguaInscript", marginX + 18, currentY + 6);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(schoolConfig.slogan || "L'excellence linguistique à portée de main", marginX + 18, currentY + 11);
      } catch (e) {
        // Fallback text if logo rendering fails
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(schoolConfig.name || "LinguaInscript", marginX, currentY + 6);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(schoolConfig.slogan || "L'excellence linguistique à portée de main", marginX, currentY + 12);
      }
    } else {
      // Default text header branding
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(schoolConfig?.name || "LinguaInscript", marginX, currentY + 6);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(schoolConfig?.slogan || "L'excellence linguistique à portée de main", marginX, currentY + 12);
    }

    // --- CAMPUS DETAIL (HEADER RIGHT) ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(selectedCampus ? selectedCampus.name : "Campus Lingua School", 195, currentY + 4, { align: "right" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(selectedCampus ? selectedCampus.address : "Cameroun", 195, currentY + 9, { align: "right" });
    doc.text(`Contact: info@linguaschool.com`, 195, currentY + 14, { align: "right" });

    currentY += 22;

    // Grey Separator Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, currentY, 195, currentY);
    currentY += 8;

    // --- INVOICE METADATA ROW ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("FACTURE ACADÉMIQUE DE SCOLARITÉ", marginX, currentY);

    const factRef = `FAC-${new Date(student.enrollmentDate).getFullYear()}-${student.id.substring(0, 5).toUpperCase()}`;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Réf : ${factRef}`, 195, currentY, { align: "right" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Date d'émission : ${new Date().toLocaleDateString("fr-FR")}`, marginX, currentY + 5.5);
    doc.text(`Statut Facturation : ${student.balance === 0 ? "PAYÉ EN TOTALITÉ" : "SOLDE RESTANT PARTIEL"}`, 195, currentY + 5.5, { align: "right" });

    currentY += 12;

    // --- STAGE: STUDENT BILLING INFO & PARENT DETAILS ---
    // Draw two horizontal cards or side-by-side boxes
    // Box Left: Pupil Information
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(marginX, currentY, 86, 38, "F");
    doc.setDrawColor(241, 245, 249);
    doc.rect(marginX, currentY, 86, 38, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("DESSINÉ POUR : L'ÉLÈVE", marginX + 4, currentY + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${student.firstName.toUpperCase()} ${student.lastName.toUpperCase()}`, marginX + 4, currentY + 12);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Contact: ${student.phone}`, marginX + 4, currentY + 17.5);
    doc.text(`Né(e) le: ${new Date(student.birthDate).toLocaleDateString("fr-FR")}`, marginX + 4, currentY + 23);
    doc.text(`Email: ${student.email}`, marginX + 4, currentY + 28.5);

    // Box Right: Parent / Class details
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(marginX + 94, currentY, 86, 38, "F");
    doc.setDrawColor(241, 245, 249);
    doc.rect(marginX + 94, currentY, 86, 38, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TUTEUR & CLASSE ASSIGNÉE", marginX + 98, currentY + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Tuteur : ${student.parentName}`, marginX + 98, currentY + 12);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Téléphone: ${student.parentPhone}`, marginX + 98, currentY + 17.5);
    
    const courseLabel = selectedClass 
      ? `Formation: ${selectedClass.language} ${selectedClass.level}` 
      : "Formation: Standard";
    const sessionLabel = selectedClass ? `Période: ${selectedClass.period}` : "";
    doc.setFont("Helvetica", "bold");
    doc.text(courseLabel, marginX + 98, currentY + 24.5);
    doc.setFont("Helvetica", "normal");
    if (sessionLabel) doc.text(sessionLabel, marginX + 98, currentY + 29.5);

    currentY += 46;

    // --- TRAINING FEES LINE ITEMS TABLE ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("RÉPARTITION DES CONDITIONS DE FORMATION", marginX, currentY);

    currentY += 3.5;

    // Gray Table Header Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, 180, 8, "F");

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Description du Service d'Enseignement", marginX + 4, currentY + 5.5);
    doc.text("Campus", marginX + 110, currentY + 5.5);
    doc.text("Prix Exigible", 191, currentY + 5.5, { align: "right" });

    currentY += 8;

    // Content of training line
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const dStr = selectedClass 
      ? `Frais de scolarité annuels - Cours intensifs de ${selectedClass.language} (Niveau ${selectedClass.level})`
      : "Frais de scolarité annuels - Enseignement linguistique";
    doc.text(dStr, marginX + 4, currentY + 6);
    doc.text(selectedCampus ? selectedCampus.name.substring(0, 20) : "Central", marginX + 110, currentY + 6);
    
    doc.setFont("Helvetica", "bold");
    doc.text(`${student.totalAmount.toLocaleString()} FCFA`, 191, currentY + 6, { align: "right" });

    currentY += 10;
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY, 195, currentY);
    currentY += 6;

    // --- PAYMENTS LEDGER INSTALMENTS SCHEDULE ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CALENDRIER DES ENCAISSEMENTS (VERSEMENTS RÉALISÉS)", marginX, currentY);

    currentY += 4;

    // Payment subtable header
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, currentY, 180, 7, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("Référence de Reçu", marginX + 4, currentY + 4.5);
    doc.text("Date émargée", marginX + 45, currentY + 4.5);
    doc.text("Méthode de Paiement", marginX + 90, currentY + 4.5);
    doc.text("Montant Encaissé", 191, currentY + 4.5, { align: "right" });

    currentY += 7;

    doc.setFontSize(8.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    if (paymentsList.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.text("Aucun versement n'a encore été enregistré pour ce dossier d'inscription.", marginX + 4, currentY + 5.5);
      currentY += 8;
    } else {
      paymentsList.forEach((p, index) => {
        const refNo = `REC-${index + 1}`.padEnd(10, " ");
        const dateStr = new Date(p.date).toLocaleDateString("fr-FR");
        
        doc.setFont("Helvetica", "bold");
        doc.text(refNo, marginX + 4, currentY + 5);
        doc.setFont("Helvetica", "normal");
        doc.text(dateStr, marginX + 45, currentY + 5);
        doc.text(p.mode, marginX + 90, currentY + 5);
        
        doc.setFont("Helvetica", "bold");
        doc.text(`${p.amount.toLocaleString()} FCFA`, 191, currentY + 5, { align: "right" });
        currentY += 6.5;
      });
    }

    currentY += 4;
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY, 195, currentY);
    currentY += 5;

    // --- FINANCIAL SUMMARY BLOCK ---
    const summaryX = 130;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("Total Scolarité Exigible :", summaryX, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${student.totalAmount.toLocaleString()} FCFA`, 191, currentY, { align: "right" });

    currentY += 5.5;

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("Net déjà Perçu (Versé) :", summaryX, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Green color for deposits
    doc.text(`${student.paidAmount.toLocaleString()} FCFA`, 191, currentY, { align: "right" });

    currentY += 5.5;

    // Accent line above final balance
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.4);
    doc.line(summaryX, currentY, 195, currentY);
    currentY += 5.5;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Solde Restant Échéant :", summaryX, currentY);
    
    if (student.balance > 0) {
      doc.setTextColor(239, 68, 68); // Red color for debt
    } else {
      doc.setTextColor(16, 185, 129); // Green color for cleared
    }
    doc.text(`${student.balance.toLocaleString()} FCFA`, 191, currentY, { align: "right" });

    currentY += 15;

    // Reset line width
    doc.setLineWidth(0.2);

    // --- EXPIRATION & TERMS INFO ---
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(marginX, currentY, 180, 14, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, currentY, 180, 14, "S");

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Rappel des dates d'inscription de l'élève :`, marginX + 4, currentY + 5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Enregistré du ${new Date(student.enrollmentDate).toLocaleDateString("fr-FR")} au ${new Date(student.expirationDate).toLocaleDateString("fr-FR")}`, marginX + 4, currentY + 9.5);

    // Signatures
    currentY += 26;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text("L'étudiant / Parent de l'élève", marginX + 15, currentY);
    doc.text("La Direction Linguistique (Cachet & Signature)", 125, currentY);

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX + 5, currentY + 16, marginX + 60, currentY + 16);
    doc.line(125, currentY + 16, 185, currentY + 16);

    // Terms footer page center
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Toute scolarité entamée est due conformément au règlement académique de l'établissement.", 105, 284, { align: "center" });
    doc.text("Document certifié conforme émis par le progiciel de scolarité sécurisé.", 105, 288, { align: "center" });

    // Download the PDF file directly (solving the iframe popups block)
    const normalizedFirstName = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const normalizedLastName = student.lastName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const invoiceFileName = `facture_${normalizedFirstName}_${normalizedLastName}.pdf`;
    doc.save(invoiceFileName);
  } catch (error) {
    console.error("Erreur lors de la génération de la facture", error);
  }
}
