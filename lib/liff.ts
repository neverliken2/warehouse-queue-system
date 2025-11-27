import liff from '@line/liff';

const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

export const initializeLiff = async () => {
  try {
    await liff.init({ liffId });

    if (!liff.isLoggedIn()) {
      liff.login();
    }

    return true;
  } catch (error) {
    console.error('LIFF initialization failed', error);
    return false;
  }
};

export const getLiffProfile = async () => {
  try {
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      return profile;
    }
    return null;
  } catch (error) {
    console.error('Failed to get LIFF profile', error);
    return null;
  }
};

export const closeLiff = () => {
  liff.closeWindow();
};

export { liff };
