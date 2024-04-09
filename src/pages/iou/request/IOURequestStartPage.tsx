import _ from 'lodash';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import { withOnyx} from 'react-native-onyx';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import DragAndDropProvider from '@components/DragAndDrop/Provider';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TabSelector from '@components/TabSelector/TabSelector';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import usePrevious from '@hooks/usePrevious';
import useThemeStyles from '@hooks/useThemeStyles';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import * as IOUUtils from '@libs/IOUUtils';
import * as KeyDownPressListener from '@libs/KeyboardShortcut/KeyDownPressListener';
import Navigation from '@libs/Navigation/Navigation';
import OnyxTabNavigator, {TopTab} from '@libs/Navigation/OnyxTabNavigator';
import * as ReportUtils from '@libs/ReportUtils';
import * as TransactionUtils from '@libs/TransactionUtils';
import * as IOU from '@userActions/IOU';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type { Policy, Report, SelectedTabRequest, Transaction } from '@src/types/onyx';
import type SCREENS from '@src/SCREENS';
import type { IOURequestType } from '@userActions/IOU';
import IOURequestStepAmount from './step/IOURequestStepAmount';
import IOURequestStepDistance from './step/IOURequestStepDistance';
import IOURequestStepScan from './step/IOURequestStepScan';
import type { WithWritableReportOrNotFoundProps } from './step/withWritableReportOrNotFound';

type IOURequestStartPageOnyxProps = {
    report: OnyxEntry<Report>;

    policy: OnyxEntry<Policy>;

    selectedTab: OnyxEntry<SelectedTabRequest>;
    
    transaction: OnyxEntry<Transaction>;
};

type IOURequestStartPageProps = IOURequestStartPageOnyxProps & WithWritableReportOrNotFoundProps<typeof SCREENS.MONEY_REQUEST.CREATE>;

function IOURequestStartPage({
    report,
    policy,
    route,
    route: {
        params: {iouType, reportID},
    },
    selectedTab,
    transaction,
}: IOURequestStartPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const navigation = useNavigation();
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const tabTitles = {
        [CONST.IOU.TYPE.REQUEST]: translate('iou.requestMoney'),
        [CONST.IOU.TYPE.SEND]: translate('iou.sendMoney'),
        [CONST.IOU.TYPE.SPLIT]: translate('iou.splitBill'),
        [CONST.IOU.TYPE.TRACK_EXPENSE]: translate('iou.trackExpense'),
    };
    const transactionRequestType = useRef(TransactionUtils.getRequestType(transaction));
    const previousIOURequestType = usePrevious(transactionRequestType.current);
    const {canUseP2PDistanceRequests} = usePermissions();
    const isFromGlobalCreate = _.isEmpty(report?.reportID);

    useFocusEffect(
        useCallback(() => {
            const handler = (event: KeyboardEvent) => {
                if (event.code !== CONST.KEYBOARD_SHORTCUTS.TAB.shortcutKey) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
            };
            KeyDownPressListener.addKeyDownPressListener(handler);

            return () => KeyDownPressListener.removeKeyDownPressListener(handler);
        }, []),
    );

    // Clear out the temporary money request if the reportID in the URL has changed from the transaction's reportID
    useEffect(() => {
        if (transaction?.reportID === reportID) {
            return;
        }
        IOU.initMoneyRequest(reportID, policy, isFromGlobalCreate, transactionRequestType.current);
    }, [transaction, policy, reportID, iouType, isFromGlobalCreate]);

    const isExpenseChat = ReportUtils.isPolicyExpenseChat(report);
    const isExpenseReport = ReportUtils.isExpenseReport(report);
    const shouldDisplayDistanceRequest = iouType !== CONST.IOU.TYPE.TRACK_EXPENSE && (canUseP2PDistanceRequests ?? isExpenseChat ?? isExpenseReport ?? isFromGlobalCreate);

    // Allow the user to create the request if we are creating the request in global menu or the report can create the request
    const isAllowedToCreateRequest = _.isEmpty(report?.reportID) || ReportUtils.canCreateRequest(report, policy, iouType);

    const navigateBack = () => {
        Navigation.dismissModal();
    };

    const resetIOUTypeIfChanged = useCallback(
        (newIouType: IOURequestType) => {
            if (newIouType === previousIOURequestType) {
                return;
            }
            if (iouType === CONST.IOU.TYPE.SPLIT && transaction?.isFromGlobalCreate) {
                IOU.updateMoneyRequestTypeParams(navigation.getState()?.routes ?? [], CONST.IOU.TYPE.REQUEST, newIouType);
            }
            IOU.initMoneyRequest(reportID, policy, isFromGlobalCreate, newIouType);
            transactionRequestType.current = newIouType;
        },
        [policy, previousIOURequestType, reportID, isFromGlobalCreate, iouType, navigation, transaction?.isFromGlobalCreate],
    );

    if (!transaction?.transactionID) {
        // The draft transaction is initialized only after the component is mounted,
        // which will lead to briefly displaying the Not Found page without this loader.
        return <FullScreenLoadingIndicator />;
    }

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableKeyboardAvoidingView={false}
            shouldEnableMinHeight={DeviceCapabilities.canUseTouchScreen()}
            headerGapStyles={isDraggingOver ? [styles.receiptDropHeaderGap] : []}
            testID={IOURequestStartPage.displayName}
        >
            {({safeAreaPaddingBottomStyle}) => (
                <FullPageNotFoundView shouldShow={!IOUUtils.isValidMoneyRequestType(iouType) || !isAllowedToCreateRequest}>
                    <DragAndDropProvider
                        setIsDraggingOver={setIsDraggingOver}
                        isDisabled={selectedTab !== CONST.TAB_REQUEST.SCAN}
                    >
                        <View style={[styles.flex1, safeAreaPaddingBottomStyle]}>
                            <HeaderWithBackButton
                                title={tabTitles[iouType]}
                                onBackButtonPress={navigateBack}
                            />
                            {iouType !== CONST.IOU.TYPE.SEND ? (
                                <OnyxTabNavigator
                                    id={CONST.TAB.IOU_REQUEST_TYPE}
                                    selectedTab={selectedTab ?? CONST.IOU.REQUEST_TYPE.SCAN}
                                    onTabSelected={resetIOUTypeIfChanged}
                                    tabBar={TabSelector}
                                >
                                    <TopTab.Screen name={CONST.TAB_REQUEST.MANUAL}>{() => <IOURequestStepAmount route={route} />}</TopTab.Screen>
                                    <TopTab.Screen name={CONST.TAB_REQUEST.SCAN}>{() => <IOURequestStepScan route={route} />}</TopTab.Screen>
                                    {shouldDisplayDistanceRequest && <TopTab.Screen name={CONST.TAB_REQUEST.DISTANCE}>{() => <IOURequestStepDistance route={route} />}</TopTab.Screen>}
                                </OnyxTabNavigator>
                            ) : (
                                <IOURequestStepAmount route={route} />
                            )}
                        </View>
                    </DragAndDropProvider>
                </FullPageNotFoundView>
            )}
        </ScreenWrapper>
    );
}

IOURequestStartPage.displayName = 'IOURequestStartPage';

export default withOnyx<IOURequestStartPageProps, IOURequestStartPageOnyxProps>({
    report: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT}${route?.params?.reportID}`,
    },
    policy: {
        key: ({report}) => `${ONYXKEYS.COLLECTION.POLICY}${report?.policyID}`,
    },
    selectedTab: {
        key: `${ONYXKEYS.COLLECTION.SELECTED_TAB}${CONST.TAB.IOU_REQUEST_TYPE}`,
    },
    transaction: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${route?.params.transactionID ?? 0}`,
    },
})(IOURequestStartPage);
