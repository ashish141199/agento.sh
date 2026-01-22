declare module 'word-extractor' {
  interface Document {
    getBody(): string
    getHeaders(): { [key: string]: string }
    getFootnotes(): string
    getEndnotes(): string
    getAnnotations(): string
  }

  class WordExtractor {
    extract(input: string | Buffer): Promise<Document>
  }

  export = WordExtractor
}
