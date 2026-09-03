export interface IErrorSource {
  path: string | number;
  message: string;
}

export interface IErrorResponse {
  success: boolean;
  message: string;
  errorSources?: IErrorSource[];
  stack?: string;
}

export interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  errorSources: IErrorSource[];
}
