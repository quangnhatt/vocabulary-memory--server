const _ = require('lodash');
const axios = require("axios");
const cheerio = require("cheerio");

const Constants = require('../common/constants');

const fetchHtmlFromUrl = async url => {
	return await axios
		.get(url)
		.then((response) => {
			return cheerio.load(response.data)
		})
		.catch(error => {
			error.status = (error.response && error.response.status) || 500;
			throw error;
		});
};

const fetchElemInnerText = elem => {
	let text = (elem && elem.text()) || '';
	return text.replace(/\n/g, '');
}

const fetchElemAttribute = (elem, dataSrc, src) => {
	const image1 = (elem && elem.attr(dataSrc));
	const image2 = (elem && elem.attr(src));
	return image1 ? image1 : (image2 || Constants.DEFAULT_IMAGE);
}


module.exports = {
	fetchHtmlFromUrl,
	fetchElemInnerText,
	fetchElemAttribute,
};
