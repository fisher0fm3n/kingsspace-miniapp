"use client";

import { PageHeader } from "@/components/PageHeader";
import { CollectionsBrowser } from "@/components/CollectionsBrowser";

export default function CollectionsPage() {
  return (
    <div>
      <PageHeader title="Collections" />
      <CollectionsBrowser />
    </div>
  );
}
