import React, { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
    useTheme, Stack, Text, DirectionalHint,
} from '@fluentui/react'
import moment from 'moment'
import {
    TkText, TkText400, TkText700, TkTextField, TkDropdown, TkStack, TkComboBox, TkSearchBox, TkMessage, TkContextualMenu,
    TkErrorMessage,
} from '../../ToolkitControls'
import ToolkitDialog from '../../ToolkitDialog'
import FileUploadDialog from '../../FileUploadDialog'
import ToolkitConfig from '../../../config/ToolkitConfig'
import { fetchProjectFunctionApps, createProjectFunctionApp, publishProjectFunctionApp, deleteProjectFunctionApp } from '../../../reducers/azureFunctionAppsSlice'
import { toggleAccountSettingsDialog, selectAccountSettingsMenu } from '../../../reducers/appBarSlice'
import useFormInput from '../../../hooks/useFormInput'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faCirclePlus, faCircleXmark, faCopy, faEllipsis, faWavePulse } from '@fortawesome/pro-light-svg-icons'
import { faCircleCheck, faTrash } from '@fortawesome/pro-solid-svg-icons'

const comboBoxOptionStyles = {
    optionText: {
        fontSize: '12px',
    },
}
const iconHoverStyles = {
    root: {
        display: 'none',
        selectors: {
            ':hover': {
                display: 'block',
                color: ToolkitConfig.theme.comunity.functional.danger600,
                fontSize: '16px',
            }
        }
    }
}
const copiedTooltipStyles = {
    root: {
        position: 'relative',
        left: '90%',
        marginTop: '-40px',
        zIndex: 1000,
        width: '100px',
        // transform: 'translateX(50%)',
        backgroundColor: '#fff',
        border: `1px solid ${ToolkitConfig.theme.comunity.grey.grey300}`,
        color: 'black',
        padding: '5px',
        borderRadius: '5px',
        whiteSpace: 'nowrap',
    }
}
const successToastStyles = {
    root: {
        position: 'absolute', top: 100, right: 0,
        zIndex: 100,
        margin: '5px 15px', borderRadius: 5,
        width: '20%',
        background: '#fff',
        border: `1px solid ${ToolkitConfig.theme.comunity.grey.grey300}`,
        selectors: {
            ':hover': { border: `1px solid ${ToolkitConfig.theme.comunity.grey.grey500}` },
        }
    }

}
const runtime = [
    {
        key: 'dotnet', text: '.NET', data: [
            { key: 'v8.0', text: '8 (LTS), isolated workerModel', data: ['dotnet-isolated', 'v8.0'] },
            { key: 'v6.0', text: '6 (LTS), isolated workerModel', data: ['dotnet-isolated', 'v6.0'] },
            { key: 'v4.8', text: '.NET Framework 4.8, isolated workerModel', data: ['dotnet-isolated', 'v4.0'] },
            { key: 'v6.00', text: '6 (LTS), in-process model', data: ['dotnet', 'v6.0'] },
        ]
    },
    {
        key: 'node', text: 'Node.js', data: [
            { key: '20', text: '20 LTS', data: ['node', '~20'] }, //WEBSITE_NODE_DEFAULT_VERSION=~20
            { key: '18', text: '18 LTS', data: ['node', '~18'] }, //WEBSITE_NODE_DEFAULT_VERSION=~18
            { key: '16', text: '16 LTS', data: ['node', '~16'] } //WEBSITE_NODE_DEFAULT_VERSION=~16
        ]
    },
    {
        key: 'python', text: 'Python', disabled: true, data: [
            { key: '3.11', text: '3.11', data: ['python', '3.11'] }, //linuxFxVersion=Python|3.11
            { key: '3.10', text: '3.10', data: ['python', '3.10'] }, //linuxFxVersion=Python|3.10
            { key: '3.9', text: '3.9', data: ['python', '3.9'] }, //linuxFxVersion=Python|3.9
            { key: '3.8', text: '3.8', data: ['python', '3.8'] }, //linuxFxVersion=Python|3.8
        ]
    },
    {
        key: 'java', text: 'Java', data: [
            //{ key: '21.0', text: '21.0 (Preview)', data: ['java', '21'] }, //linuxFxVersion=Java|21
            { key: '17.0', text: '17.0', data: ['java', '17'] },
            { key: '11.0', text: '11.0', data: ['java', '11'] },
            { key: '8.0', text: '8.0', data: ['java', '8'] }
        ]
    },
    {
        key: 'psc', text: 'PowerShell Core', data: [
            { key: '7.4', text: '7.4 (Preview)', data: ['powershell', '7.4'] },
            { key: '7.2', text: '7.2', data: ['powershell', '7.2'] }
        ]
    },
    {
        key: 'custom', text: 'Custom Handler', data: [
            { key: 'custom', text: 'custom', data: ['custom', ''] }
        ]
    },
]

export default function FunctionApps(props) {
    const { project } = props

    const functionAppsState = useSelector(state => state.azureFunctionApps)
    const isLoading = useSelector(state => state.azureFunctionApps.status)
    const isDeleting = useSelector(state => state.azureFunctionApps.deleting)
    const isCreating = useSelector(state => state.azureFunctionApps.creating)
    const isPublishing = useSelector(state => state.azureFunctionApps.publishing)
    const publishingError = useSelector(state => state.azureFunctionApps.publishingError)
    const fetchError = useSelector(state => state.azureFunctionApps.fetchError)
    const processError = useSelector(state => state.azureFunctionApps.error)
    const creatingError = useSelector(state => state.azureFunctionApps.createError)
    const succesfulFunctionAppCreate = useSelector(state => state.azureFunctionApps.createSuccess)

    const loginDetails = useSelector(state => state.login)
    const user = loginDetails.user
    const profile = user.profile
    const [busy, setBusy] = useState(false)
    const [processErrorText, setProcessErrorText] = useState(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [errorText, setErrorText] = useState(null)
    const [selectedRuntime, setSelectedRuntime] = useState(runtime[0])
    const [selectedRuntimeVersion, setSelectedRuntimeVersion] = useState(runtime[0].data[0].key)
    const [appRuntimeStack, setAppRuntimeStack] = useState()
    const [appRuntimeVersion, setAppRuntimeVersion] = useState()
    const functionName = useFormInput('')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [hideUploadDialog, setHideUploadDialog] = useState(false)
    const [fileDetails, setFileDetails] = useState(null)
    const [displayFileName, setDisplayFileName] = useState(null)
    const [viewDetails, setViewDetails] = useState(false)
    const [viewAllDetails, setViewAllDetails] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedOptions, setSelectedOptions] = useState(['All functions'])
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showContextMenu, setShowContextMenu] = useState(false)
    const [selectedApp, setSelectedApp] = useState(null)
    const [functionAppsList, setFunctionAppsList] = useState([])
    const [functionAppCreated, setFunctionAppCreated] = useState(false)
    const [viewSuccessToast, setViewSuccessToast] = useState(false)
    const contextMenuItemsRef = useRef([])
    const contextMenuDataRef = useRef(null)
    const isFirstRender = useRef(true)
    const dispatch = useDispatch()
    const theme = useTheme()

    useEffect(_ => {
        dispatch(fetchProjectFunctionApps(project.Name))
    }, [dispatch, project.Name])


    useEffect(() => {
        if (functionAppsState && functionAppsState.entities) {
            const updatedFunctionApps = Object.values(functionAppsState.entities)?.map(app => ({
                ...app,
                tooltipVisible: false,
            }))
            setFunctionAppsList(updatedFunctionApps)
        }
    }, [functionAppsState, functionAppCreated, isDeleting])

    useEffect(() => {
        if (!isDeleting && !processError) {
            setShowDeleteDialog(false)
        }
    }, [isDeleting, processError])

    useEffect(() => {
        if (processError) {
            setProcessErrorText(processError)
        } else {
            setProcessErrorText(null)
        }
    }, [processError])

    useEffect(() => {
        if (!isCreating && !creatingError) {
            setShowCreateDialog(false)
        }
    }, [isCreating, creatingError])

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        if (!isCreating && !showCreateDialog && !creatingError) {
            setViewSuccessToast(succesfulFunctionAppCreate)
        }
    }, [isCreating, showCreateDialog, creatingError])

    useEffect(() => {
        if (!publishingError && !errorText && !isPublishing) {
            setShowEditDialog(false)
        }
    }, [publishingError, errorText, isPublishing])

    const urlUploadExtra = `/toolkit/zipdeploy/${project.Name}`

    console.log('RENDERING: FunctionApps')
    if (fetchError) {
        return <Stack tokens={{ padding: 20 }}><TkErrorMessage mainText={`Error Fetching list `} /></Stack>
    }
    if (isLoading !== 'loaded') {
        return <Stack tokens={{ padding: 20 }}><TkText400 >Loading...</TkText400></Stack>
    } else {
        return (
            <Stack tokens={{ padding: 20, childrenGap: 20 }} styles={{ root: { overflow: 'hidden' } }}>
                <Stack horizontal styles={{ root: { width: '100%', alignItems: 'center', justifyContent: 'space-between' } }}>
                    <Stack ><TkText700>Azure Function Apps</TkText700></Stack>
                    <Stack
                        tokens={{ padding: 0 }}
                        styles={{ root: { overflow: 'hidden', margin: '0 15px' } }}
                    >
                        <Stack horizontal tokens={{ childrenGap: 10 }} styles={{ root: { justifyContent: 'space-between' } }}>
                            <Stack horizontal styles={{ root: { alignItems: 'center', marginRight: '10px' } }} >
                                <Stack tokens={{ padding: '10px' }}><TkText700 >View</TkText700></Stack>
                                <TkComboBox
                                    defaultSelectedKey={['All roles']}
                                    selectedKey={selectedOptions}
                                    multiSelect
                                    autoComplete='on'
                                    allowFreeform={true}
                                    styles={{ root: { width: 225 }, title: { height: 36, lineHeight: 36 }, caretDown: { lineHeight: 36 } }}
                                    comboBoxOptionStyles={comboBoxOptionStyles}
                                />
                            </Stack>
                            <Stack styles={{ root: { width: 250 } }}>
                                <TkSearchBox
                                    placeholder='Start typing to find'
                                    onChange={(_, v) => setSearchText(v)}
                                    onClear={(_) => setSearchText('')}
                                    onEscape={(_) => setSearchText('')}
                                    onSearch={(v) => setSearchText(v)}
                                    value={searchText}

                                />
                            </Stack>

                            <Stack styles={{ root: { width: 25 } }}>
                                <TkStack horizontalAlign='end' styles={{ root: { position: 'absolute', top: 85, right: 0 } }} helpId='15000' />
                            </Stack>

                        </Stack>

                        {viewSuccessToast ? <Stack key={props.key} horizontal tokens={{ paddingg: '15px 25px', childrenGap: 12 }} verticalAlign='center'
                            styles={successToastStyles}
                        >
                            <Stack grow horizontal styles={{ root: { width: 100 } }}>
                                <Stack styles={{ root: { width: 10, borderRadius: '5px 0 0 5px', background: theme.comunity.primary.green400, width: '20px' } }}>
                                </Stack>
                                <Stack grow tokens={{ padding: 10, childrenGap: 8 }}>
                                    <Stack horizontal>
                                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: theme.comunity.primary.green400, fontSize: 16, marginRight: 10 }} />
                                        <TkText700 styles={{ root: { color: theme.comunity.primary.green400 } }}>Azure Function App created successfully</TkText700>

                                    </Stack>
                                    <Text variant='tiny' styles={{ root: { alignSelf: 'start', padding: '0 5px', borderRadius: 5, background: '#fff' } }}>Your Azure Function App has been created successfully and is now ready to be used in your project. View Azure Function Apps for more information and details</Text>
                                    <Text variant='tiny' styles={{ root: { textDecoration: 'underline', cursor: 'pointer' } }} onClick={showNotificationSettings}>Manage notifications</Text>
                                    <TkText400 styles={{ root: { colorr: 'white' } }}>{props.message}</TkText400>
                                </Stack>
                                <Stack id={`notification-item-${props.key}`} tokens={{ padding: 10 }} styles={{ root: { cursor: 'pointer', alignSelf: 'start' } }}
                                >
                                    <FontAwesomeIcon onClick={() => setViewSuccessToast(false)} style={{ fontSize: '12px', colorr: 'white' }} icon={faCircleXmark} />
                                </Stack>
                            </Stack>
                        </Stack> : null}

                    </Stack>
                </Stack>
                <Stack styles={{ root: { margin: '15px 0px 5px 0px' } }}>
                    <TkMessage
                        background={theme.comunity.grey.grey400}
                        iconColour={theme.comunity.grey.grey900}
                        mainText='View and manage all your Azure Function Apps for this project here. Click on an app to see details or make changes'
                    />
                </Stack>
                <Stack styles={{ root: { overflow: 'auto' } }}>

                    <Stack horizontal styles={{ root: { width: '100%', justifyContent: 'space-between' } }}>
                        <Stack grow={1} styles={{ root: { width: '350px' } }}><TkText700>Name</TkText700></Stack>
                        <Stack grow={5} styles={{ root: { width: '750px' } }}><TkText700>URL</TkText700></Stack>

                        <Stack horizontalAlign='end' grow={1} horizontal onClick={() => toggleViewAllDetails()}>
                            {functionAppsList.length > 0 ?
                                <> <Stack horizontal tokens={{ padding: 2 }} styles={{ root: { backgroundColor: theme.comunity.grey.grey500, borderRadius: '35%', margin: '5px', marginLeft: '0px' } }}>
                                    <FontAwesomeIcon icon={viewAllDetails === true ? faChevronUp : faChevronDown} style={{ color: 'black', height: 12 }} />
                                </Stack>
                                    <Stack>

                                        <TkText700 styles={{
                                            root: {
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                whiteSpace: 'nowrap',
                                                margin: 'auto',
                                                marginRight: '30px'
                                            }
                                        }} > {viewAllDetails === true ? 'Collapse all' : 'Expand all'}</TkText700>

                                    </Stack></>
                                : null}
                        </Stack>
                    </Stack>
                    {functionAppsList.length > 0 ? renderList() : <Stack tokens={{ padding: 15 }} styles={{
                        root: {
                            margin: '5px 0',
                            borderRadius: '10px',
                            background: theme.comunity.grey.grey200,
                        }
                    }}><TkText400> You haven't created any Azure Function Apps for this project yet. Click 'Create Function App' to get started.</TkText400></Stack>}
                    <Stack grow>
                        <Stack
                            grow
                            horizontal
                            tokens={{ padding: '20px 20px 0px 5px', childrenGap: 10 }}
                            styles={{ root: { cursor: 'pointer', marginBottom: '40px' } }}
                        >
                            <FontAwesomeIcon
                                style={{ fontSize: 16, cursor: 'pointer' }}
                                icon={faCirclePlus}
                            />
                            <Text
                                variant='small'
                                styles={{ root: { textDecoration: 'underline' } }}
                            >
                                <span onClick={() => setShowCreateDialog(true)}> Create a function app</span>
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
                {showCreateDialog && (
                    <ToolkitDialog
                        hidden={false}
                        minWidth='800px'
                        height='50%'
                        title='Deploy Function App code'
                        showCloseButton={true}
                        busy={isCreating}
                        onDismissCallback={handleCancelCreate}
                        cancelText='Cancel'
                        onCancelCallback={handleCancelCreate}
                        actionText={<Stack styles={{ root: { whiteSpace: 'nowrap' } }}>Create function app</Stack>}
                        onActionCallback={handleCreateFunctionApp}
                    >
                        <>
                            <Stack tokens={{ childrenGap: 20 }} styles={{ root: { margin: '15px 0px 5px 0px' } }}>
                                <TkMessage
                                    background={theme.comunity.grey.grey400}
                                    iconColour={theme.comunity.grey.grey900}
                                    mainText='Fill in the details below to create your new Azure Function App. Ensure you provide a unique name for the app'
                                />
                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 10 }}>
                                <TkTextField
                                    styles={{ root: { width: 370 } }}
                                    label='Function App Name'
                                    {...functionName}
                                />
                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 10 }} styles={{ root: { width: '100%', justifyContent: 'space-between' } }}>
                                <TkDropdown style={{ width: 370 }} label='Runtime Stack' options={runtime} selectedKey={selectedRuntime.key} onChange={handleRuntimeChange} />
                                <TkDropdown style={{ width: 370 }} label='Version' options={selectedRuntime.data} selectedKey={selectedRuntimeVersion} onChange={(e, o) => setSelectedRuntimeVersion(o.key)} />
                            </Stack>
                            <Stack styles={{ root: { marginTop: 20 } }}></Stack>
                            {creatingError ? <TkErrorMessage mainText={'Error creating function app'} /> : null}

                        </>
                    </ToolkitDialog>
                )
                }
                {showEditDialog && (
                    <ToolkitDialog
                        hidden={false}
                        minWidth='800px'
                        height='auto'
                        title='Deploy Function App code'
                        showCloseButton={true}
                        busy={isPublishing}
                        onDismissCallback={handleCancelEdit}
                        cancelText='Cancel'
                        onCancelCallback={handleCancelEdit}
                        actionText={<Stack styles={{ root: { whiteSpace: 'nowrap' } }}>Publish changes</Stack>}
                        onActionCallback={handleEditFunctionApp}
                    >
                        <>
                            <Stack tokens={{ childrenGap: 20 }} styles={{ root: { margin: '15px 0px 5px 0px' } }}>
                                <TkMessage
                                    background={theme.comunity.grey.grey400}
                                    iconColour={theme.comunity.grey.grey900}
                                    mainText='Upload your function app code  (Need verification on this message)'
                                />
                            </Stack>
                            <Stack tokens={{ childrenGap: 10 }} styles={{ root: { marginTop: 20 } }}>
                                <TkText700>Azure Function App name</TkText700>
                                <TkText400 >{selectedApp}</TkText400>
                                <Stack horizontal styles={{ root: { justifyContent: 'start' } }}>
                                    <Stack tokens={{ childrenGap: 10 }} styles={{ root: { width: 400 } }} >
                                        <TkText700>Runtime Stack</TkText700>
                                        <TkText400 >{appRuntimeStack}</TkText400>
                                    </Stack>

                                    <Stack tokens={{ childrenGap: 10 }} styles={{ root: { width: 400 } }}>
                                        <TkText700>Runtime Version</TkText700>
                                        <TkText400 >{appRuntimeVersion}</TkText400>
                                    </Stack>

                                </Stack>

                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 10 }} styles={{ root: { width: '100%', justifyContent: 'space-between' } }}>

                            </Stack>

                            <Stack horizontal tokens={{ childrenGap: 10 }} styles={{ root: { width: '100%', justifyContent: 'space-between', marginTop: 20 } }} >
                                <Stack styles={{ root: { width: '50%' } }}>

                                    <FileUploadDialog
                                        hidden={false}
                                        width='50%'
                                        fileTypeFilter='*.zip'
                                        onResultCallback={f => {
                                            console.log(f)
                                            setFileDetails(f)
                                            // setFileDetails(f.name); 
                                            setDisplayFileName(f.name)
                                        }}
                                        onErrorCallback={e => console.log(e)}
                                        onDismissCallback={() => handleCancelUpload()}
                                        embedded={true}
                                        additionalPath={urlUploadExtra}
                                    />

                                </Stack>
                                <Stack styles={{ root: { width: '50%' } }}>
                                    <TkText700>Uploaded files</TkText700>
                                    {displayFileName ? <Stack tokens={{ padding: 10 }} horizontal styles={{
                                        root: {
                                            color: 'white',
                                            selectors: {
                                                ':hover': {
                                                    background: theme.comunity.grey.grey300,
                                                    color: theme.comunity.functional.danger600,
                                                    cursor: 'pointer'
                                                },
                                            },
                                        }
                                    }}>
                                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: theme.comunity.primary.green400, marginRight: 5, fontSize: 16 }} />
                                        <TkText400>{displayFileName}  New upload complete</TkText400>
                                        <FontAwesomeIcon icon={faTrash} style={{ ...iconHoverStyles, marginLeft: 10 }} onClick={() => setDisplayFileName(null)} />
                                    </Stack>
                                        :
                                        <TkText400>Your code has not been uploaded yet. You can upload your files now or add them later. </TkText400>}
                                </Stack>
                            </Stack>
                            <Stack styles={{ root: { marginTop: 10 } }}>
                                {publishingError ? <TkErrorMessage mainText={'Error publishing app'} /> : null}
                                {errorText ? <TkErrorMessage mainText={errorText} /> : null}
                            </Stack>

                        </>
                    </ToolkitDialog>
                )
                }


                {showDeleteDialog && (
                    <ToolkitDialog
                        hidden={false}
                        minWidth='500px'
                        height='25%'
                        title='Confirm App Delete'
                        onDismissCallback={handleCancelDelete}
                        cancelText='Cancel'
                        onCancelCallback={handleCancelDelete}
                        actionText='Delete'
                        actionType='danger'
                        busy={isDeleting}
                        onActionCallback={() => handleDeleteFunction(selectedApp)}
                        topOffset={50}
                    >
                        <Stack
                            tokens={{ padding: 5, childrenGap: 5 }}
                            styles={{ root: { overflow: 'hidden', height: '100%' } }}
                        >
                            {!processErrorText && <TkErrorMessage mainText={`Are you sure you want to delete ${selectedApp}?`} />}
                            {processErrorText && <TkErrorMessage mainText={'Error deleting function app!'} />}
                        </Stack>

                    </ToolkitDialog>
                )}
                <TkContextualMenu
                    items={contextMenuItemsRef.current}
                    hidden={!showContextMenu}
                    onDismiss={(_) => setShowContextMenu(false)}
                    target={showContextMenu}
                    isBeakVisible={false}
                    directionalHint={DirectionalHint.rightTopEdge}
                    directionalHintFixed={false}
                    styles={{
                        header: { fontSize: '18px', fontWeight: 'bold', color: 'black' },
                    }}
                    onMenuOpened={(_) => (contextMenuDataRef.current = null)}
                />
            </Stack>
        )

        function handleEditFunctionApp() {

            if (!fileDetails) {
                setErrorText('Please upload a zip file before publishing.')
                return
            }

            const body = {
                Name: moment().format('YYYY-MM-DD HH:mm'),
                Description: 'Deploy zip',
                ZipFilename: fileDetails.fileUrl,
                ZipFileSha: fileDetails.shaUrl,
            }

            console.log('Publishing with body:', body)

            dispatch(publishProjectFunctionApp(selectedApp, project.Name, body))

            const url = `${ToolkitConfig.serverUrl}${ToolkitConfig.serviceRoot}UserProfile(${profile.Id})`
            const init = {
                headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + loginDetails.authHeader },
                method: 'PATCH',
                body: JSON.stringify({
                    Name: profile.Name ?? '',
                    Surname: profile.Surname ?? '',
                    Cell: profile.Cell ?? '',
                    Email: profile.Email ?? '',
                    CompanyName: profile.CompanyName ?? '',
                    CompanyRole: profile.CompanyRole ?? '',
                }),
            }

            setBusy(true)
            setErrorText(null)

            fetch(url, init)
                .then(response => {
                    if (response.status === 204) {
                        setBusy(false)
                        return
                    }
                    return response.json().then(json => {
                        const error = json['odata.error']
                        if (error) {
                            setErrorText(error.message.value)
                        } else {
                            setErrorText('Error occurred during login')
                        }
                        setBusy(false)
                    })
                })
                .catch(error => {
                    console.error(error)
                    setErrorText('Error occurred during fetch')
                    setBusy(false)
                })

            setShowEditDialog(!publishingError)
        }

        function renderList() {
            let itemsList = functionAppsList
            if (searchText.length > 0) {
                itemsList = functionAppsList.filter(r => r.Name.toLowerCase().includes(searchText.toLowerCase()))
            }

            return itemsList.length > 0 ? itemsList?.map((r, idx) => {
                const background = idx % 2 === 0 ? theme.comunity.grey.grey200 : 'initial'
                const isDetailsVisible = viewDetails[r.Name] || false
                return (
                    <Stack key={r.Name} tokens={{ childrenGap: 0, padding: '10px 5px' }} styles={{
                        root: {
                            margin: '2px 0',
                            borderRadius: '10px',
                            border: `1px solid ${theme.comunity.grey.grey300}`,
                            background,
                            selectors: {
                                ':hover': {
                                    background: theme.comunity.grey.grey300,
                                },
                            },
                        },
                    }}>
                        <Stack horizontal tokens={{ childrenGap: 0 }}>
                            <Stack grow={1} tokens={{ childrenGap: 0 }} styles={{ root: { width: 270 } }}>
                                <TkText700>{r.Name}</TkText700>
                                {isDetailsVisible && <>
                                    <Stack>
                                        <Stack horizontal><TkText400 style={{ width: '150px' }}>Created:</TkText400> <TkText400>{moment(r.Created ?? '').add(2, 'hours').format('YYYY-MM-DD HH:mm')}</TkText400> <TkText400 /></Stack>
                                        <Stack horizontal><TkText400 style={{ width: '150px' }}>Deployment List:</TkText400>
                                            <Stack>{r.Publishes?.map((publish, index) => {
                                                return <Stack key={index} horizontal tokens={{ childrenGap: 10 }}><TkText400>{publish.Name}</TkText400><TkText400>{publish.AzureDeployStatus}</TkText400></Stack>
                                            })}</Stack>
                                        </Stack>
                                    </Stack>
                                </>}
                            </Stack>
                            <Stack horizontal grow={5} >
                                <Stack styles={{ root: { justifyContent: 'flex-start', width: 250 } }}>
                                    <TkText400>{r.SiteUrl.length > 30 ? r.SiteUrl.slice(0, 30) + '...' : r.SiteUrl}<FontAwesomeIcon onClick={() => handleCopyToClipboard(r.SiteUrl, idx)} icon={faCopy} style={{ fontSize: 16, paddingLeft: 10, cursor: 'pointer' }} /></TkText400>
                                    {r.tooltipVisible && <Stack styles={copiedTooltipStyles}><TkText400>Link Copied...</TkText400></Stack>} </Stack>
                                <Stack horizontal verticalAlign='center' styles={{ root: { width: 200, margin: '0px 60px' } }}>

                                    <Text variant='tiny' styles={{ root: { alignSelf: 'start', padding: '0 5px', borderRadius: 5, background: theme.comunity.primary.green200 } }}>    <FontAwesomeIcon icon={faWavePulse} style={{ color: 'black', fontSize: 12, padding: '0px 5px 0px 2px' }} />Active Function App</Text>
                                </Stack>
                            </Stack>

                            <Stack horizontal tokens={{ childrenGap: 5 }} styles={{ root: { cursor: 'pointer', textDecoration: 'underline', marginRight: 10 } }} >
                                <Stack horizontal tokens={{ childrenGap: 5 }} onClick={() => toggleViewDetails(r.Name)}>
                                    <FontAwesomeIcon icon={isDetailsVisible ? faChevronUp : faChevronDown} />
                                    <TkText400 >View details</TkText400>
                                </Stack>
                                <Stack onClick={(e) =>
                                    contextMenuNew(e, r.Name, r.RuntimeStack, r.RuntimeVersion)
                                }>
                                    <FontAwesomeIcon icon={faEllipsis} />
                                </Stack>
                            </Stack>
                        </Stack>
                    </Stack>
                )
            })
                : <TkText>No matches</TkText>
        }

        function handleRuntimeChange(event, option) {
            setSelectedRuntime(option)
            setSelectedRuntimeVersion(option.data[0].key)
        }

        function handleCreateFunctionApp() {
            const selectedItem = selectedRuntime.data.find(r => r.key === selectedRuntimeVersion)
            if (selectedItem.data) {
                const body = {
                    Name: functionName.value,
                    RuntimeStack: selectedItem.data[0],
                    RuntimeVersion: selectedItem.data[1],
                    ApplicationInsights: false,
                    AzureAppStatus: 'New',
                }
                dispatch(createProjectFunctionApp(project.Name, body))
            }
            if (isCreating) {
                setShowCreateDialog(false)
            } else {
                setShowCreateDialog(true)
            }

        }

        function handleCancelCreate() {
            setShowCreateDialog(false)
            setViewSuccessToast(false)
        }
        function handleCancelEdit() {
            setShowEditDialog(false)
        }

        function handleDeleteFunction(name) {
            setProcessErrorText(null)
            dispatch(deleteProjectFunctionApp(name, project.Name))?.then(() => {
                if (!isDeleting && !processError) {
                    setShowDeleteDialog(false)
                } else {
                    setShowDeleteDialog(true)
                }
            })
        }

        function handleCancelDelete() {
            setProcessErrorText(null)
            setShowDeleteDialog(false)
        }


        function toggleViewDetails(name) {
            setViewDetails(prevState => {
                const newState = { ...prevState }
                newState[name] = !newState[name]
                return newState
            })
        }

        function toggleViewAllDetails() {
            const newViewDetailsValue = !viewAllDetails
            const newViewDetails = {}
            functionAppsList.forEach(item => {
                newViewDetails[item.Name] = newViewDetailsValue
            })
            setViewDetails(newViewDetails)
            setViewAllDetails(newViewDetailsValue)
        }


        function contextMenuNew(event, name, runtimeStack, runtimeVersion) {
            event.stopPropagation()
            contextMenuItemsRef.current = navigationMenu(name, runtimeStack, runtimeVersion)
            setShowContextMenu(event)
        }
        function navigationMenu(name, runtimeStack, runtimeVersion) {
            return [
                {
                    key: 'editFunction',
                    itemType: 0,
                    text: 'Edit function app details',
                    itemProps: {
                        styles: {
                            label: { fontSize: '11px' },
                            icon: { color: 'black', fontSize: '11px' },
                        },
                    },
                    iconProps: { iconName: 'Edit', color: 'black' },
                    onClick: () => handleSelectedEditApp(name, runtimeStack, runtimeVersion)
                },
                {
                    key: 'editSettings',
                    itemType: 0,
                    text: 'Edit Function app settings',
                    itemProps: {
                        styles: {
                            label: { fontSize: '11px' },
                            icon: { color: 'black', fontSize: '11px' },
                        },
                    },
                    iconProps: { iconName: 'Settings', color: 'black' },
                    onClick: () => handleContextualMenuOption(name),
                },
                {
                    key: 'deleteFunction',
                    itemType: 0,
                    text: 'Delete function app',
                    itemProps: {
                        styles: {
                            label: { fontSize: '11px' },
                            icon: { color: 'black', fontSize: '11px' },
                        },
                    },
                    iconProps: { iconName: 'Delete', color: 'black' },
                    onClick: () => handleselectedApp(name),

                },
            ]
        }
        function handleselectedApp(name) {
            setShowDeleteDialog(true)
            setSelectedApp(name)
        }
        function handleSelectedEditApp(name, runtimeStack, runtimeVersion) {
            setShowEditDialog(true)
            setSelectedApp(name)
            setAppRuntimeStack(runtimeStack)
            setAppRuntimeVersion(runtimeVersion)
        }
        function handleCancelUpload() {
            setFileDetails(null)
            setDisplayFileName(null)
            setHideUploadDialog(true)
        }

        function handleContextualMenuOption(name) {
            console.log(name)
        }
        function showNotificationSettings() {
            dispatch(selectAccountSettingsMenu({ menu: { key: 'notifications' } }))
            dispatch(toggleAccountSettingsDialog())
        }
        function handleCopyToClipboard(link, index) {
            navigator.clipboard.writeText(link)
            setFunctionAppsList(prevState => prevState?.map((app, i) =>
                i === index ? { ...app, tooltipVisible: true } : app
            ))
            setTimeout(() => {
                setFunctionAppsList(prevState => prevState?.map((app, i) =>
                    i === index ? { ...app, tooltipVisible: false } : app
                ))
            }, 2000)
        }
    }
}