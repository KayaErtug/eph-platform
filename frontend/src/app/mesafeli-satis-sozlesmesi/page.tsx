import type { Metadata } from "next";
import PaymentTerms from "@/components/payments/PaymentTerms";

export const metadata: Metadata = { title: "Mesafeli Satış Sözleşmesi | EPH", description: "Emlak Portföy Havuzu dijital hizmetleri için mesafeli satış sözleşmesi." };

export default function Page() { return <PaymentTerms document="sales" />; }
