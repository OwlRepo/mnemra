ALTER TABLE "chunks" DROP CONSTRAINT "chunks_document_id_documents_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_key" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
