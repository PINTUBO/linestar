// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import ModalConfirm from 'antd/lib/modal/confirm';
import {
    EditOutlined, BuildOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';

import { RawLabel, RawAttribute } from 'cvat-core-wrapper';
import RawViewer from './raw-viewer';
import ConstructorViewer from './constructor-viewer';
import ConstructorCreator from './constructor-creator';
import ConstructorUpdater from './constructor-updater';
import { idGenerator, LabelOptColor } from './common';

enum ConstructorMode {
    SHOW = 'SHOW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
}

interface LabelsEditorProps {
    labels: RawLabel[];
    onSubmit: (labels: LabelOptColor[]) => void;
}

interface LabelsEditorState {
    constructorMode: ConstructorMode;
    creatorType: 'basic' | 'skeleton';
    savedLabels: LabelOptColor[];
    unsavedLabels: LabelOptColor[];
    labelForUpdate: LabelOptColor | null;
}

export default class LabelsEditor extends React.PureComponent<LabelsEditorProps, LabelsEditorState> {
    public constructor(props: LabelsEditorProps) {
        super(props);

        this.state = {
            savedLabels: [],
            unsavedLabels: [],
            constructorMode: ConstructorMode.SHOW,
            creatorType: 'basic',
            labelForUpdate: null,
        };
    }

    public componentDidMount(): void {
        // just need performe the same code
        this.componentDidUpdate((null as any) as LabelsEditorProps);
    }

    public componentDidUpdate(prevProps: LabelsEditorProps): void {
        function transformLabel(label: RawLabel): LabelOptColor {
            return {
                name: label.name,
                id: label.id || idGenerator(),
                color: label.color,
                type: label.type,
                edges: label.edges,
                elements: label.elements,
                sublabels: label.sublabels,
                svg: label.svg,
                has_parent: label.has_parent,
                attributes: label.attributes.map(
                    (attr: RawAttribute): RawAttribute => ({
                        id: attr.id || idGenerator(),
                        name: attr.name,
                        input_type: attr.input_type,
                        mutable: attr.mutable,
                        values: [...attr.values],
                        default_value: attr.values[0],
                    }),
                ),
            };
        }

        const { labels } = this.props;

        if (!prevProps || prevProps.labels !== labels) {
            const transformedLabels = labels.map(transformLabel);
            this.setState({
                savedLabels: transformedLabels.filter((label: LabelOptColor) => (label.id as number) >= 0),
                unsavedLabels: transformedLabels.filter((label: LabelOptColor) => (label.id as number) < 0),
            });
        }
    }

    private handleRawSubmit = (labels: LabelOptColor[]): void => {
        const unsavedLabels = [];
        const savedLabels = [];

        for (const label of labels) {
            if (label.id as number >= 0) {
                savedLabels.push(label);
            } else {
                unsavedLabels.push(label);
            }
        }

        this.setState({ unsavedLabels, savedLabels });
        this.handleSubmit(savedLabels, unsavedLabels);
    };

    private handleCreate = (label: LabelOptColor | null): void => {
        if (label === null) {
            this.setState({ constructorMode: ConstructorMode.SHOW });
        } else {
            const { unsavedLabels, savedLabels } = this.state;
            const newUnsavedLabels = [
                ...unsavedLabels,
                {
                    ...label,
                    id: idGenerator(),
                },
            ];

            this.setState({ unsavedLabels: newUnsavedLabels });
            this.handleSubmit(savedLabels, newUnsavedLabels);
        }
    };

    private handleUpdate = (label: LabelOptColor | null): void => {
        const { savedLabels, unsavedLabels } = this.state;

        if (label) {
            const filteredSavedLabels = savedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
            const filteredUnsavedLabels = unsavedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
            if (label.id as number >= 0) {
                filteredSavedLabels.push(label);
                this.setState({
                    savedLabels: filteredSavedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            } else {
                filteredUnsavedLabels.push(label);
                this.setState({
                    unsavedLabels: filteredUnsavedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            }

            this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        } else {
            this.setState({ constructorMode: ConstructorMode.SHOW });
        }
    };

    private handleDelete = (label: LabelOptColor): void => {
        const deleteLabel = (): void => {
            const { unsavedLabels, savedLabels } = this.state;

            const filteredUnsavedLabels = unsavedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);
            const filteredSavedLabels = savedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);

            this.setState({ savedLabels: filteredSavedLabels, unsavedLabels: filteredUnsavedLabels });
            this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        };

        if (typeof label.id !== 'undefined' && label.id >= 0) {
            ModalConfirm({
                className: 'cvat-modal-delete-label',
                icon: <ExclamationCircleOutlined />,
                title: `Do you want to delete "${label.name}" label?`,
                content: 'This action is irreversible. Annotation corresponding with this label will be deleted.',
                type: 'warning',
                okType: 'danger',
                onOk() {
                    deleteLabel();
                },
            });
        } else {
            deleteLabel();
        }
    };

    private handleSubmit(savedLabels: LabelOptColor[], unsavedLabels: LabelOptColor[]): void {
        function transformLabel(label: LabelOptColor): LabelOptColor {
            const transformed: any = {
                name: label.name,
                id: label.id as number < 0 ? undefined : label.id,
                color: label.color,
                type: label.type || 'any',
                attributes: label.attributes.map((attr: RawAttribute): RawAttribute => ({
                    name: attr.name,
                    id: attr.id as number < 0 ? undefined : attr.id,
                    input_type: attr.input_type.toLowerCase() as RawAttribute['input_type'],
                    default_value: attr.values[0],
                    mutable: attr.mutable,
                    values: [...attr.values],
                })),
            };

            if (label.type === 'skeleton') {
                transformed.svg = label.svg;
                transformed.sublabels = (label.sublabels || [])
                    .map((internalLabel: LabelOptColor) => transformLabel(internalLabel));
                transformed.elements = label.elements;
                transformed.edges = label.edges;
            }

            return transformed;
        }

        const { onSubmit } = this.props;
        const output = savedLabels.concat(unsavedLabels)
            .map((label: LabelOptColor): LabelOptColor => transformLabel(label));

        onSubmit(output);
    }

    public render(): JSX.Element {
        const { labels } = this.props;
        const {
            savedLabels, unsavedLabels, constructorMode, labelForUpdate, creatorType,
        } = this.state;

        return (
            <Tabs
                defaultActiveKey='2'
                type='card'
                tabBarStyle={{ marginBottom: '0px' }}
            >
                <Tabs.TabPane
                    tab={(
                        <span>
                            <EditOutlined />
                            <Text>Raw</Text>
                        </span>
                    )}
                    key='1'
                >
                    <RawViewer labels={[...savedLabels, ...unsavedLabels]} onSubmit={this.handleRawSubmit} />
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={(
                        <span>
                            <BuildOutlined />
                            <Text>Constructor</Text>
                        </span>
                    )}
                    key='2'
                >
                    {constructorMode === ConstructorMode.SHOW && (
                        <ConstructorViewer
                            labels={[...savedLabels, ...unsavedLabels]}
                            onUpdate={(label: LabelOptColor): void => {
                                this.setState({
                                    constructorMode: ConstructorMode.UPDATE,
                                    labelForUpdate: label,
                                });
                            }}
                            onDelete={this.handleDelete}
                            onCreate={(_creatorType: 'basic' | 'skeleton'): void => {
                                this.setState({
                                    creatorType: _creatorType,
                                    constructorMode: ConstructorMode.CREATE,
                                });
                            }}
                        />
                    )}
                    {constructorMode === ConstructorMode.UPDATE && labelForUpdate !== null && (
                        <ConstructorUpdater label={labelForUpdate} onUpdate={this.handleUpdate} />
                    )}
                    {constructorMode === ConstructorMode.CREATE && (
                        <ConstructorCreator
                            creatorType={creatorType}
                            labelNames={labels.map((l) => l.name)}
                            onCreate={this.handleCreate}
                        />
                    )}
                </Tabs.TabPane>
            </Tabs>
        );
    }
}
