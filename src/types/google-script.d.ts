declare namespace google {
  namespace script {
    interface Runner {
      withSuccessHandler(handler: (result: any) => void): Runner;
      withFailureHandler(handler: (error: Error) => void): Runner;
      apiGetUsers(): void;
      apiGetVouchers(): void;
      apiSaveVoucher(voucher: any): void;
      apiDeleteVoucher(id: string, reason: string, user: string): void;
      apiLogin(username: string, password: string): void;
      apiSaveUser(user: any): void;
      apiDeleteUser(id: string): void;
    }
    const run: Runner;
  }
}
