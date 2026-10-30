import { HttpContext } from '@angular/common/http';
import { HANDLE_API_ERROR_LOCALLY } from '../interceptors/http-context';
/** Feature pages own inline errors; session handling remains global. Always return a fresh context. */
export const featureHttpContext = () => new HttpContext().set(HANDLE_API_ERROR_LOCALLY, true);
