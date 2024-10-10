const RLog = require("rlog-js");
const rlog = new RLog();
const fs = require("fs");
const AdmZip = require("adm-zip");
const sharp = require("sharp");
const { extractFull } = require('node-7z');

rlog.info("Start...");

const colorList = [
  "#000000",
  "#0000ff",
  "#00ff00",
  "#80ff80",
  "#ff0000",
  "#ff00ff",
  "#ffff00",
  "#ffffff",
  "#808080",
  "#0080ff",
  "#00ff80",
  "#80ffff",
  "#ff8080",
  "#ff80ff",
  "#ffff80",
  "#ffffc8",
];

function colorToHex(color) {
  for (let i = 0; i < colorList.length; i++) {
    if (colorList[i] === color) {
      return i.toString(16);
    }
  }
}

// 图片密码解析函数
async function getPassword(imgPath) {
  // 获取图片大小
  const { width, height } = await getImageDimensions(imgPath);
  // 分为9份，输出每份中间点的颜色
  const x = width / 3;
  const y = height / 3;
  const colors = [];
  for (let i = 0; i < 9; i++) {
    const color = await getPixelColor(
      imgPath,
      Math.floor(x * (i % 3) + x / 2),
      Math.floor(y * Math.floor(i / 3) + y / 2)
    );
    colors.push(color);
    rlog.log(
      color,
      Math.floor(x * (i % 3) + x / 2),
      y * Math.floor(i / 3) + y / 2
    );
  }
  // 将颜色转换为十六进制
  const password = colors.map(colorToHex).join("");
  return password;
}

async function getImageDimensions(imgPath) {
  try {
    const image = sharp(imgPath);
    const metadata = await image.metadata();

    const width = metadata.width;
    const height = metadata.height;

    return { width, height };
  } catch (error) {
    rlog.error("无法获取图片的尺寸:", error);
  }
}
async function getPixelColor(imagePath, x, y) {
  try {
    const image = sharp(imagePath);
    const { width, height } = await image.metadata();

    if (x < 0 || y < 0 || x >= width || y >= height) {
      throw new Error("Coordinates out of bounds");
    }

    const pixelData = await image.raw().toBuffer();

    const channels = 4;
    const index = (y * width + x) * channels;
    const r = pixelData[index];
    const g = pixelData[index + 1];
    const b = pixelData[index + 2];

    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)}`;

    return hexColor;
  } catch (error) {
    console.error("Error getting pixel color:", error);
  }
}

// zip文件解压缩函数
function unzip(zipPath, outPath, password) {
  const zip = new AdmZip(zipPath);
  if (password) {
    zip.setPassword(password);
  }
  zip.extractAllTo("temp/" + outPath, true);
  rlog.info("Unzip file success.");
}

async function unzip7z(zipPath, outPath, password) {
  return new Promise((resolve, reject) => {
      const unzipStream = extractFull(zipPath, outPath, {
          password: password,
          $bin: require('7zip-bin').path7za 
      });

      unzipStream.on('end', () => {
          rlog.success('解压完成');
          resolve();
      });

      unzipStream.on('error', (err) => {
          rlog.error('解压出错:', err);
          reject(err);
      });
  });
}



// 16进制转10进制
function hexToDec(hex) {
  return parseInt(hex, 16);
}
async function main() {
  // 初始解压缩
  unzip("goodscript.zip", "99");
  for (let i = 99; i !== 0; i--) {
    // 找到密码图片
    const imgPath = "temp/" + i + "/password" + i + ".png";
    rlog.info("Get password image:", imgPath);
    // 获取密码
    const password = await getPassword(imgPath);
    rlog.log("temp/" + i + "/" + i + ".7z");
    await unzip7z("temp/" + i + "/" + i + ".7z", "temp/"+(i - 1)+"/", hexToDec(password));
    
  }
}
main();
