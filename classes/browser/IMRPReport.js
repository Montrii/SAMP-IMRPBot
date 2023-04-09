class IMRPReport
{
    title;
    link;
    postsCount;
    viewsCount;
    lastPostLink;
    lastPostAccountLink;
    lastPostAccountName;

    section;


    reportedFamily;
    constructor(title, link, postsCount, viewsCount, lastPostLink, lastPostAccountLink, lastPostAccountName, section, reportedFamily)
    {
        this.title = title;
        this.link = link;
        this.postsCount = postsCount;
        this.viewsCount = viewsCount;
        this.lastPostLink = lastPostLink;
        this.lastPostAccountLink = lastPostAccountLink;
        this.lastPostAccountName = lastPostAccountName;
        this.section = section;
        this.reportedFamily = reportedFamily;
    }


    getReportedFamily()
    {
        return this.reportedFamily;
    }
    getSection()
    {
        return this.section;
    }

    getTitle()
    {
        return this.title;
    }

    getLink()
    {
        return this.link;
    }

    getPostsCount()
    {
        return this.postsCount;
    }

    getViewsCount()
    {
        return this.viewsCount;
    }

    getLastPostLink()
    {
        return this.lastPostLink;
    }

    getLastPostAccountName()
    {
        return this.lastPostAccountName;
    }

    getLastPostAccountLink()
    {
        return this.lastPostAccountLink;
    }
}

module.exports = IMRPReport;