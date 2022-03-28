const {
    fetchHtmlFromUrl,
    fetchElemAttribute,
    fetchElemInnerText,
} = require('./helpers');
const Constants = require('../common/constants');

const URL = Constants.VN_EXPRESS_URL;

exports.extractData = async () => {
    const $ = await fetchHtmlFromUrl(URL);
    const articleTop = extractArticleTop($);
    const articlesSubNewTop = extractArticlesSubNewTop($);
    const articlesOld = extractArticlesOld($);
    return [...articleTop, ...articlesSubNewTop, ...articlesOld];
}

function extractArticleTop($) {
    const articleTop = $('.article-topstory');
    const imageUrl = articleTop.find('.thumb-art>a>picture>img');
    const title = articleTop.find('.title-news>a');
    const description = articleTop.find('.description>a');

    return [{
        image: fetchElemAttribute(imageUrl, 'data-src', 'src'),
        title: fetchElemInnerText(title),
        url: fetchElemAttribute(title, 'href'),
        description: fetchElemInnerText(description),
    }];
}

function extractArticlesSubNewTop($) {
    const articleSubNewTop = $('.sub-news-top');
    const listSub = articleSubNewTop.find('.list-sub-feature>li');
    const data = [];
    listSub.each((i, e) => {
        const title = $(e).find('h3>a');
        const description = $(e).find('.description>a');
        const post = {
            image: fetchElemAttribute(title, 'data-src', 'src'),
            title: fetchElemInnerText(title),
            url: fetchElemAttribute(title, 'href'),
            description: fetchElemInnerText(description),
        };
        data.push(post);
    });

    return data;
}

function extractArticlesOld($) {
    const articlesOld = $('.section_stream_home .col-left .item-news');
    const data = [];
    articlesOld.each((i, e) => {
        const title = $(e).find('.title-news>a');
        const imageUrl = $(e).find('.thumb-art>a>picture>img');
        const description = $(e).find('.description>a');
        const post = {
            image: fetchElemAttribute(imageUrl, 'data-src', 'src'),
            title: fetchElemInnerText(title),
            url: fetchElemAttribute(title, 'href'),
            description: fetchElemInnerText(description),
        };
        data.push(post);
    });

    return data;
}