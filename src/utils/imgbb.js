export const uploadImageToImgBB = async (file) => {
  const API_KEY = '4436b8894f84ed8cae91a6a72ec93d8c';
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', API_KEY);

  try {
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.success) {
      return data.data.display_url;
    } else {
      throw new Error(data.error?.message || 'Failed to upload image');
    }
  } catch (error) {
    console.error('ImgBB Upload Error:', error);
    throw error;
  }
};
