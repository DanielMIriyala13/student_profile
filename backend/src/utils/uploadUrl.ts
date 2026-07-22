export const getUploadUrl = (filename: string): string => {
  const prefix = process.env.UPLOAD_URL_PREFIX || '/student_profile/uploads';
  return `${prefix}/${filename}`;
};
