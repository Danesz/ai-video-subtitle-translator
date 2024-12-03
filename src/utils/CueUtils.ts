
// Helper function to strip HTML from strings
export function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
}