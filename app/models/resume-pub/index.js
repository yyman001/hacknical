import crypto from 'crypto';

import ResumePub from './schema';
import Resume from '../resumes';
import ShareAnalyse from '../share-analyse';
import dateHelper from '../../utils/date';

const { getSeconds, getDateAfterDays } = dateHelper;

const getResumeHash = (userId) => {
  const salt = crypto.randomBytes(8).toString('base64');
  const bytes = new Buffer(toString(userId) || '', 'utf16le');
  const src = new Buffer(salt || '', 'base64');
  const dst = new Buffer(src.length + bytes.length);

  src.copy(dst, 0, 0, src.length);
  bytes.copy(dst, src.length, 0, bytes.length);

  const hash = crypto.createHash('sha1').update(dst).digest('base64');
  return hash.split('/').join('');
};

const resumeValidation = (timestamp) => {
  const secondsNow = getSeconds();
  if(secondsNow > timestamp) {
    return false;
  }
  return true;
};

const createResumeShare = async (options) => {
  await ShareAnalyse.createShare(options);
};

const findPublicResume = async (options) => {
  const findResult = await ResumePub.findOne(options);
  if (!findResult) {
    return Promise.resolve({
      success: false,
    });
  }
  return Promise.resolve({
    success: true,
    result: findResult
  });
};

const addPubResume = async (userId, options = {}) => {
  const timestamp = getSeconds(getDateAfterDays(options.days || 10));
  const maxView = options.maxView || 500;
  const resumeHash = getResumeHash(userId);

  await createResumeShare({
    userId,
    url: `resume/${resumeHash}`
  });

  const saveResult = await ResumePub.create({
    userId,
    timestamp,
    maxView,
    resumeHash
  });

  if (saveResult) {
    return Promise.resolve({
      success: true,
      message: '创建成功',
      result: saveResult
    });
  }
  return Promise.resolve({
    success: false,
    message: '创建失败',
    result: null
  });
};

const updatePubResume = async (userId, resumeHash, options) => {
  const findResult = await findPublicResume({ userId, resumeHash });
  let { result, success } = findResult;
  if (!success) {
    return findResult;
  }
  Object.assign(result, options);

  await result.save();

  return Promise.resolve({
    success: true
  });
};

const checkPubResume = async (options) => {
  const findResult = await findPublicResume(options);
  if (!findResult.success) { return findResult; }
  const { userId, openShare } = findResult.result;

  if (!openShare) {
    return Promise.resolve({
      success: false
    });
  }

  const findResume = await Resume.getResume(userId);
  if (!findResume.success) { return findResume }

  return Promise.resolve({
    success: true,
    result: findResume.result.info.name
  });
};

const getPubResume = async (resumeHash) => {
  const findResult = await findPublicResume({ resumeHash });
  const { result, success } = findResult;
  if (!success) {
    return findResult;
  }

  const { timestamp, maxView, userId, openShare } = result;

  if (!openShare) {
    return Promise.resolve({
      success: false,
      message: '用户已关闭分享'
    });
  }

  // if (!maxView) {
  //   await deletePubResume(userId, resumeHash);
  //   return Promise.resolve({
  //     success: false,
  //     message: '已超过最大查看次数'
  //   });
  // }
  //
  // if (!resumeValidation(timestamp)) {
  //   await deletePubResume(userId, resumeHash);
  //   return Promise.resolve({
  //     success: false,
  //     message: '已过期'
  //   });
  // }

  return await Resume.getResume(userId);
};

const deletePubResume = async (userId, resumeHash) => {
  await ResumePub.remove({ userId, resumeHash });
  return Promise.resolve({
    success: true
  });
};

const clearPubResume = async (userId) => {
  await ResumePub.remove({ userId });
  return Promise.resolve({
    success: true
  });
};


export default {
  findPublicResume,
  addPubResume,
  updatePubResume,
  deletePubResume,
  clearPubResume,
  getPubResume,
  checkPubResume
}
