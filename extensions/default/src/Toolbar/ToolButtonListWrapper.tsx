import React from 'react';
import {
  ToolButtonList,
  ToolButton,
  ToolButtonListDefault,
  ToolButtonListDropDown,
  ToolButtonListItem,
  ToolButtonListDivider,
} from '@ohif/ui-next';
import { useToolbar } from '@ohif/core/src';

interface ToolButtonListWrapperProps {
  groupId: string;
  buttonSection: string;
  onInteraction?: (details: {
    groupId: string;
    itemId: string;
    commands?: Record<string, unknown>;
  }) => void;
}

/**
 * Wraps the ToolButtonList component to handle the OHIF toolbar button structure
 * @param props - Component props
 * @returns Component
 * // test
 */
export default function ToolButtonListWrapper({
  groupId,
  buttonSection,
}: ToolButtonListWrapperProps) {
  const { onInteraction, toolbarButtons } = useToolbar({
    buttonSection,
  });

  if (!toolbarButtons?.length) {
    return null;
  }

  const primary =
    toolbarButtons.find(button => button.componentProps.isActive)?.componentProps ||
    toolbarButtons[0].componentProps;

  const items = toolbarButtons.map(button => button.componentProps);

  return (
    <ToolButtonList>
      <ToolButtonListDefault>
        <div
          data-cy={`${groupId}-split-button-primary`}
          data-tool={primary.id}
          data-active={primary.isActive}
        >
          <ToolButton
            {...primary}
            onInteraction={({ itemId }) =>
              onInteraction?.({ groupId, itemId, commands: primary.commands })
            }
            className={primary.className}
          />
        </div>
      </ToolButtonListDefault>
      <ToolButtonListDivider className={primary.isActive ? 'opacity-0' : 'opacity-100'} />
      <div id="SplitButton" data-cy={`${groupId}-split-button-secondary`}>
        <ToolButtonListDropDown>
          {items.map(item => {
            // Pass only props that ToolButtonListItem consumes. Spreading the
            // full button componentProps would leak non-DOM props (evaluate,
            // commands, isActive, options, etc.) onto the underlying div and
            // trigger React warnings.
            return (
              <ToolButtonListItem
                key={item.id}
                id={item.id}
                icon={item.icon}
                disabled={item.disabled}
                disabledText={item.disabledText}
                tooltip={item.tooltip}
                className={item.className}
                data-cy={item.id}
                data-tool={item.id}
                data-active={item.isActive}
                onSelect={() =>
                  onInteraction?.({ groupId, itemId: item.id, commands: item.commands })
                }
              >
                <span className="pl-1">{item.label || item.tooltip || item.id}</span>
              </ToolButtonListItem>
            );
          })}
        </ToolButtonListDropDown>
      </div>
    </ToolButtonList>
  );
}
