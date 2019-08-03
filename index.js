#!/usr/bin/env node

const moment = require('moment');
const axios = require('axios');

const amountArg = process.argv[2] || 0;
const unitArg = process.argv[3] || 'days';
const token = process.argv[4] || null;

if (!token) {
  throw new Error('Not token provided');
}

const date = moment().subtract(amountArg, unitArg);
if (!date.isValid()) {
  throw new Error('Invalid date format');
}

console.info(`All files dated less than will ${date.toISOString()} be removed. `);
console.info('Do you wish to continue ?  (y ou n)');

process.stdin.resume();
process.stdin.on('data', async (option) => {
  if (!['y', 'yes'].includes(option.toString().trim())) {
    console.info('Aborted execution');
    process.exit(0);
  }
  try {
    await processRemoveAllFiles(date);
  } catch (e) {
    console.error(e);
  }
});

const removeFile = async (file) => {
  await axios.delete(`https://slack.com/api/files.delete?token=${token}&file=${file.id}`, {}, 
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
  });
  console.info(`[${moment(file.timestamp * 1000).toISOString()}] Removed ${file.name} - (${(file.size/1024).toFixed(0)} kb)`);
}

const getAllFilesForRemove = async (dateLastThem, backupFiles = true, lastPage = 0) => {
  const time = dateLastThem.unix();
  const page = lastPage + 1;
  const { data } = await axios.get(`https://slack.com/api/files.list?token=${token}&ts_to=${time}&page=${page}&count=100`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  for (file of data.files) {
    await removeFile(file);
  }
  if (data.paging.pages > page) {
    await getAllFilesForRemove(dateLastThem, backupFiles, page);
  }
}

const processRemoveAllFiles = async (dateLastThem) => {
  try {
    await getAllFilesForRemove(dateLastThem);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}


