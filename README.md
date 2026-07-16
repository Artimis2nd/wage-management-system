# =============================================================================
# PROJECT ARCHITECTURE
# Version : 3.0
#
# Purpose
# -----------------------------------------------------------------------------
# This document is the architectural index of the project.
#
# Read this file BEFORE planning any implementation.
#
# This document is intentionally concise.
# Detailed documentation is stored in separate files and should only be opened
# when relevant to the current task.
# =============================================================================
ฉันใช้งานในภาษาไทย ถ้าจะตอบหรืออธิบาย แปลภาษามาตอบให้ฉันด้วย


# =============================================================================
# 1. PROJECT PHILOSOPHY
# =============================================================================

This project prioritizes:

1. Maintainability
2. Reusability
3. Extensibility
4. Readability
5. Low Coupling

Adding a feature does NOT necessarily mean adding new code.

Always search existing architecture first.

Reuse > Extend > Create New



# =============================================================================
# 2. GOLDEN RULES
# =============================================================================

Rule 1

Never hardcode
if an existing system already supports it.

Rule 2

Never duplicate logic.

Rule 3

Never bypass Factory.

Rule 4

Never bypass Registry.

Rule 5

Never bypass Manager.

Rule 6

Every data has exactly ONE owner.

Rule 7

UI never owns gameplay logic.

Rule 8

Every modified file must have a reason.

Rule 9

Never modify unrelated systems.

Rule 10

Search before implementing.

Never guess.



# =============================================================================
# 3. AI WORKFLOW
# =============================================================================

Requirement

↓

Understand Requirement

↓

Search Existing System

↓

Locate Owner

↓

Locate Related Files

↓

Architecture Review

↓

Implementation Plan

↓

User Approval

↓

ACT

↓

Validation



# =============================================================================
# 4. TASK CLASSIFICATION
# =============================================================================

Before implementing,
classify the request.

Category A

Parameter Tuning

Examples

- Damage
- Speed
- Cooldown
- HP

Normally

Locate parameter only.

No architecture changes.



Category B

Feature Extension

Examples

- New Effect
- New Skill
- New Enemy

Reuse existing systems first.



Category C

New System

Examples

- Quest System
- Dialogue System

Architecture Review required.



# =============================================================================
# 5. CURRENT ARCHITECTURE MAP
# =============================================================================

Core

- Event Bus
- State Machine
- Config
- Save System

Gameplay

- Player
- Enemy
- Combat
- Inventory
- Skills

Factories

- Effect Factory
- Projectile Factory
- Enemy Factory

Registries

- Effect Registry
- Skill Registry
- Enemy Registry
- Item Registry

Managers

- Asset Manager
- Audio Manager
- Scene Manager
- UI Manager

Rendering

- Renderer
- Animation
- Effects

UI

- HUD
- Menus
- Inventory UI



# =============================================================================
# 6. DESIGN PATTERNS
# =============================================================================

Factory

Creates objects.

Registry

Stores definitions.

Blueprint

Stores configuration only.

Manager

Coordinates systems.

State Machine

Controls state transitions.

Event Bus

Communicates systems.

Config

Stores tunable parameters.



# =============================================================================
# 7. SYSTEM OWNERSHIP
# =============================================================================

Player

Owns

- HP
- Stamina
- Player State

Inventory

Owns

- Items

Equipment

Owns

- Equipped Items

Save System

Owns

- Persistence

UI

Owns

Nothing.

UI only reads.



# =============================================================================
# 8. REUSE POLICY
# =============================================================================

Before creating new code,
always check for

Factory

Registry

Manager

Blueprint

Config

Utility

If found,

reuse it.

Do not create another implementation.



# =============================================================================
# 9. HARDCODE POLICY
# =============================================================================

Forbidden

Magic Numbers

Magic Strings

Manual Asset Loading

Manual Object Creation

Direct Drawing
if Renderer already exists

Direct Effect Creation
if Effect Factory exists

Allowed

Configuration

Blueprint

Registry

Factory

Manager



# =============================================================================
# 10. MODIFICATION SCOPE
# =============================================================================

AI must define

Allowed Files

Affected Files

Protected Files

Do NOT modify files
outside the approved scope.

If additional files are required,

STOP

Explain why.

Ask first.



# =============================================================================
# 11. MINIMUM CHANGE PRINCIPLE
# =============================================================================

Always prefer

Small Change

over

Large Refactor.

Only modify

what is necessary
to satisfy the requirement.



# =============================================================================
# 12. ARCHITECTURE REVIEW
# =============================================================================

Before implementation answer:

Have I searched existing systems?

Am I duplicating logic?

Am I introducing hardcode?

Am I bypassing Factory?

Am I bypassing Registry?

Am I modifying unrelated files?

Am I increasing coupling?

Can this be solved
using configuration only?



# =============================================================================
# 13. WHEN TO OPEN ADDITIONAL DOCUMENTS
# =============================================================================

Do NOT read all documentation.

Open only when needed.

Examples

Adding Effect

↓

Read

EffectFactory.md

EffectRegistry.md


Adding Enemy

↓

Read

EnemyFactory.md

EnemyRegistry.md


Changing Save

↓

Read

SaveSystem.md


Changing Rendering

↓

Read

Renderer.md



# =============================================================================
# 14. OUTPUT FORMAT
# =============================================================================

Before ACT,
AI should report

Requirement Summary

Task Category

Files to Read

Files to Modify

Reason for each file

Architecture Impact

Risk

Alternative Solution

Recommendation

Wait for user approval.



# =============================================================================
# END
# =============================================================================