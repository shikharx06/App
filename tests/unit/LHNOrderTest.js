import React from 'react';
import Onyx from 'react-native-onyx';
import {render} from '@testing-library/react-native';
import SidebarLinks from '../../src/pages/home/sidebar/SidebarLinks';
import waitForPromisesToResolve from '../utils/waitForPromisesToResolve';
import {LocaleContextProvider} from '../../src/components/withLocalize';

const fakeInsets = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
};

const fakePersonalDetails = {
    'email1@test.com': {
        login: 'email1@test.com',
        displayName: 'Email One',
        avatar: 'none',
        firstName: 'ReportID',
    },
    'email2@test.com': {
        login: 'email2@test.com',
        displayName: 'Email Two',
        avatar: 'none',
        firstName: 'One',
    },
    'email3@test.com': {
        login: 'email3@test.com',
        displayName: 'Email Three',
        avatar: 'none',
        firstName: 'ReportID',
    },
    'email4@test.com': {
        login: 'email4@test.com',
        displayName: 'Email Four',
        avatar: 'none',
        firstName: 'Two',
    },
    'email5@test.com': {
        login: 'email5@test.com',
        displayName: 'Email Five',
        avatar: 'none',
        firstName: 'ReportID',
    },
    'email6@test.com': {
        login: 'email6@test.com',
        displayName: 'Email Six',
        avatar: 'none',
        firstName: 'Three',
    },
};

const fakeReport1 = {
    reportID: 1,
    reportName: 'Report One',
    unreadActionCount: 0,

    // This report's last comment will be in the past
    lastMessageTimestamp: Date.now() - 3000,
    participants: ['email1@test.com', 'email2@test.com'],
};
const fakeReport2 = {
    reportID: 2,
    reportName: 'Report Two',
    unreadActionCount: 0,
    lastMessageTimestamp: Date.now() - 2000,
    participants: ['email3@test.com', 'email4@test.com'],
};
const fakeReport3 = {
    reportID: 3,
    reportName: 'Report Three',
    unreadActionCount: 0,
    lastMessageTimestamp: Date.now() - 1000,
    participants: ['email5@test.com', 'email6@test.com'],
};

const fakeReport1Actions = {
    actionName: 'ADDCOMMENT',
    person: [],
    sequenceNumber: 0,

    // This comment will be in the past
    timestamp: Date.now() - 2000,
    message: [
        {type: 'comment', reportID: 1, text: 'Comment One'},
    ],
};
const fakeReport2Actions = {
    actionName: 'ADDCOMMENT',
    person: [],
    sequenceNumber: 0,
    timestamp: Date.now() - 1000,
    message: [
        {type: 'comment', reportID: 2, text: 'Comment Two'},
    ],
};
const fakeReport3Actions = {
    actionName: 'ADDCOMMENT',
    person: [],
    sequenceNumber: 0,
    timestamp: Date.now(),
    message: [
        {type: 'comment', reportID: 2, text: 'Comment Three'},
    ],
};

const ONYXKEYS = {
    PERSONAL_DETAILS: 'personalDetails',
    CURRENTLY_VIEWED_REPORTID: 'currentlyViewedReportID',
    NVP_PRIORITY_MODE: 'nvp_priorityMode',
    COLLECTION: {
        REPORT: 'report_',
        REPORT_ACTIONS: 'reportActions_',
        REPORTS_WITH_DRAFT: 'reportWithDraft_',
    },
};

Onyx.init({
    keys: ONYXKEYS,
    registerStorageEventListener: () => {},
});

jest.disableAutomock();

function getDefaultRenderedSidebarLinks() {
    // Wrap the SideBarLinks inside of LocaleContextProvider so that all the locale props
    // are passed to the component. If this is not done, then all the locale props are missing
    // and there are a lot of render warnings. It needs to be done like this because normally in
    // our app (App.js) is when the react application is wrapped in the context providers
    return render((
        <LocaleContextProvider>
            <SidebarLinks
                onLinkClick={() => {}}
                insets={fakeInsets}
                onAvatarClick={() => {}}
                isSmallScreenWidth={false}
            />
        </LocaleContextProvider>
    ));
}

// Icons need to be explicitly mocked. The testing library throws an error when trying to render them
jest.mock('../../src/components/Icon/Expensicons', () => ({
    MagnifyingGlass: () => '',
    Pencil: () => '',
}));

describe('Sidebar', () => {
    describe('in default mode', () => {

        // Clear out Onyx after each test so that each test starts with a clean slate
        afterEach(Onyx.clear);

        test('is not rendered when there are no props passed to it', () => {
            // GIVEN all the default props are passed to SidebarLinks
            // WHEN it is rendered
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            // THEN it should render nothing and be null
            // This is expected because there is an early return when there are no personal details
            expect(sidebarLinks.toJSON()).toBe(null);
        });

        test('is rendered with an empty list when personal details exist', () => {
            // GIVEN the sidebar is rendered with default props
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()

                // WHEN Onyx is updated with some personal details
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                }))

                // THEN the component should be rendered with an empty list since it will get past the early return
                .then(() => {
                    expect(sidebarLinks.toJSON()).not.toBe(null);
                    expect(sidebarLinks.toJSON().children.length).toBe(2);
                    expect(sidebarLinks.queryAllByText('ReportID, One')).toHaveLength(0);
                });
        });

        test('contains one report when a report is in Onyx', () => {
            // GIVEN the sidebar is rendered in default mode (most recent first)
            // while currently viewing report 1
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()

                // WHEN Onyx is updated with some personal details and a report
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '1',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                }))

                // THEN the component should be rendered with an item for the fake report
                .then(() => {
                    expect(sidebarLinks.toJSON()).not.toBe(null);
                    expect(sidebarLinks.toJSON().children.length).toBe(2);
                    expect(sidebarLinks.getAllByText('ReportID, One')).toHaveLength(1);
                });
        });

        test('orders items with most recently updated on top', () => {
            // GIVEN the sidebar is rendered in default mode (most recent first)
            // while currently viewing report 1
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()

                // WHEN Onyx is updated with some personal details and multiple reports
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '1',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: fakeReport2,
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                // THEN the component should be rendered with the mostly recently updated report first
                .then(() => {
                    expect(sidebarLinks.toJSON()).not.toBe(null);
                    const reportOptions = sidebarLinks.getAllByText(/ReportID, (One|Two|Three)/);
                    expect(reportOptions).toHaveLength(3);

                    // The reports should be in the order 3 > 2 > 1
                    expect(reportOptions[0].children[0].props.children).toBe('ReportID, Three');
                    expect(reportOptions[1].children[0].props.children).toBe('ReportID, Two');
                    expect(reportOptions[2].children[0].props.children).toBe('ReportID, One');
                });
        });

        test('doesn\'t change the order when adding a draft to the active report', () => {
            // GIVEN the sidebar is rendered in default mode (most recent first)
            // while currently viewing report 1
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()

                // WHEN Onyx is updated with some personal details and multiple reports
                // and a draft on the active report (report 1 is the oldest report, so it's listed at the bottom)
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '1',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: {hasDraft: true, ...fakeReport1},
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: fakeReport2,
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                // THEN there should be a pencil icon and report one should still be the last one
                .then(() => {
                    const pencilIcon = sidebarLinks.getAllByAccessibilityHint('Pencil Icon');
                    expect(pencilIcon).toHaveLength(1);

                    // The reports should be in the order 3 > 2 > 1
                    const reportOptions = sidebarLinks.getAllByText(/ReportID, (One|Two|Three)/);
                    expect(reportOptions).toHaveLength(3);
                    expect(reportOptions[2].children[0].props.children).toBe('ReportID, One');
                });
        });

        test('reorders the reports to always have the most recently updated one on top', () => {
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()
                // GIVEN the sidebar is rendered in default mode (most recent first)
                // while currently viewing report 1
                // with reports in top-to-bottom order of 3 > 2 > 1
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '1',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: fakeReport2,
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                // WHEN a new comment is added to report 1 (eg. it's lastMessageTimestamp is updated)
                .then(() => Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}1`, {lastMessageTimestamp: Date.now()}))

                // THEN the order of the reports should be 1 > 3 > 2
                //                                         ^--- (1 goes to the front and pushes other two down)
                .then(() => {
                    const reportOptions = sidebarLinks.getAllByText(/ReportID, (One|Two|Three)/);
                    expect(reportOptions).toHaveLength(3);
                    expect(reportOptions[0].children[0].props.children).toBe('ReportID, One');
                    expect(reportOptions[1].children[0].props.children).toBe('ReportID, Three');
                    expect(reportOptions[2].children[0].props.children).toBe('ReportID, Two');
                });
        });

        test('reorders the reports to keep draft reports on top', () => {
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()
                // GIVEN the sidebar is rendered in default mode (most recent first)
                // while currently viewing report 2 (the one in the middle)
                // with a draft on report 2
                // with reports in top-to-bottom order of 3 > 2 > 1
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '2',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: {hasDraft: true, ...fakeReport2},
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                // WHEN the currently active chat is switched to report 1 (the one on the bottom)
                .then(() => Onyx.merge(ONYXKEYS.CURRENTLY_VIEWED_REPORTID, '1'))

                // THEN the order of the reports should be 2 > 3 > 1
                //                                         ^--- (2 goes to the front and pushes 3 down)
                .then(() => {
                    const reportOptions = sidebarLinks.getAllByText(/ReportID, (One|Two|Three)/);
                    expect(reportOptions).toHaveLength(3);
                    expect(reportOptions[0].children[0].props.children).toBe('ReportID, Two');
                    expect(reportOptions[1].children[0].props.children).toBe('ReportID, Three');
                    expect(reportOptions[2].children[0].props.children).toBe('ReportID, One');
                });
        });

        test('removes the pencil icon when draft is removed', () => {
            const sidebarLinks = getDefaultRenderedSidebarLinks();

            return waitForPromisesToResolve()
                // GIVEN the sidebar is rendered in default mode (most recent first)
                // while currently viewing report 2 (the one in the middle)
                // with a draft on report 2
                // with reports in top-to-bottom order of 3 > 2 > 1
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '2',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: {hasDraft: true, ...fakeReport2},
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                .then(() => {
                    const pencilIcon = sidebarLinks.getAllByAccessibilityHint('Pencil Icon');
                    expect(pencilIcon).toHaveLength(1);
                })

                // WHEN the draft on report 2 is removed
                .then(() => Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}2`, {hasDraft: null}))

                // THEN the pencil icon goes away
                .then(() => {
                    const pencilIcon = sidebarLinks.queryAllByAccessibilityHint('Pencil Icon');
                    expect(pencilIcon).toHaveLength(0);
                });
        });

        test('puts draft reports at the top when the page refreshes', () => {
            const sidebarLinks = getDefaultRenderedSidebarLinks();
            let sidebarAfterRefresh;

            return waitForPromisesToResolve()
                // GIVEN the sidebar is rendered in default mode (most recent first)
                // while currently viewing report 2 (the one in the middle)
                // with a draft on report 2
                // with reports in top-to-bottom order of 3 > 2 > 1
                .then(() => Onyx.multiSet({
                    [ONYXKEYS.NVP_PRIORITY_MODE]: 'default',
                    [ONYXKEYS.PERSONAL_DETAILS]: fakePersonalDetails,
                    [ONYXKEYS.CURRENTLY_VIEWED_REPORTID]: '2',
                    [`${ONYXKEYS.COLLECTION.REPORT}1`]: fakeReport1,
                    [`${ONYXKEYS.COLLECTION.REPORT}2`]: {hasDraft: true, ...fakeReport2},
                    [`${ONYXKEYS.COLLECTION.REPORT}3`]: fakeReport3,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: fakeReport1Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport2Actions,
                    [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: fakeReport3Actions,
                }))

                // WHEN the sidebar is re-rendered from scratch, simulating a page refresh
                // because data is still in Onyx
                .then(() => {
                    sidebarAfterRefresh = getDefaultRenderedSidebarLinks();

                    // ensures rendering is done
                    return waitForPromisesToResolve();
                })

                // THEN the reports are in the order 2 > 3 > 1
                //                                   ^--- (2 goes to the front and pushes 3 down)
                .then(() => {
                    const reportOptions = sidebarAfterRefresh.getAllByText(/ReportID, (One|Two|Three)/);
                    expect(reportOptions).toHaveLength(3);
                    expect(reportOptions[0].children[0].props.children).toBe('ReportID, Two');
                    expect(reportOptions[1].children[0].props.children).toBe('ReportID, Three');
                    expect(reportOptions[2].children[0].props.children).toBe('ReportID, One');
                });
        });
    });
});
