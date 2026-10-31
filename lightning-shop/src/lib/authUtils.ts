import { auth } from '@/lib/firebase';

// 發送或重新發送驗證信
export async function sendVerificationEmail(user = auth.currentUser) {
  try {
    if (user && !user.emailVerified) {
      await user.sendEmailVerification();
      return { success: true, message: '驗證信已成功發送！' };
    }
    return { success: false, message: '使用者不存在或已經完成驗證。' };
  } catch (error: any) {
    console.error('發送驗證信失敗:', error);
    let errorMsg = '發送失敗，請稍後再試。';
    if (error.code === 'auth/too-many-requests') {
      errorMsg = '發送請求過於頻繁，請稍候再試。';
    }
    return { success: false, message: errorMsg };
  }
}