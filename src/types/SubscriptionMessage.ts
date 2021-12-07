export enum SubscriptionMessageState {
  Published = 'published',
  Processed = 'processed',
  ProcessingError = 'processing_error',
  ProcessingErrorRetry = 'processing_error_retry',
}
